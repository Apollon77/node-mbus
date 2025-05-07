#include "mbus-master.h"
#include "util.h"
#include "node.h"

#ifdef _WIN32
#define __PRETTY_FUNCTION__ __FUNCSIG__
#else
#include <unistd.h>
#endif

#define MBUS_ERROR(...) fprintf (stderr, __VA_ARGS__)
#define MAXFRAMES 16

using namespace v8;

Nan::Persistent<v8::Function> MbusMaster::constructor;

MbusMaster::MbusMaster() {
    connected = false;
    serial = true;
    communicationInProgress = false;
    handle = NULL;
    uv_rwlock_init(&queueLock);
}

MbusMaster::~MbusMaster(){
    if(connected && handle) {
        mbus_disconnect(handle);
    }
    if(handle) {
        mbus_context_free(handle);
        handle = NULL;
    }
    uv_rwlock_destroy(&queueLock);
}

NAN_MODULE_INIT(MbusMaster::Init) {
    Nan::HandleScope scope;

    // Prepare constructor template
    Local<FunctionTemplate> tpl = Nan::New<FunctionTemplate>(New);
    tpl->SetClassName(Nan::New<v8::String>("MbusMaster").ToLocalChecked());
    tpl->InstanceTemplate()->SetInternalFieldCount(1);

    // link our getters and setter to the object property
    Nan::SetAccessor(tpl->InstanceTemplate(), Nan::New("connected").ToLocalChecked(), MbusMaster::HandleGetters, MbusMaster::HandleSetters);
    Nan::SetAccessor(tpl->InstanceTemplate(), Nan::New("communicationInProgress").ToLocalChecked(), MbusMaster::HandleGetters, MbusMaster::HandleSetters);

    // Prototype
    Nan::SetPrototypeMethod(tpl, "openSerial", OpenSerial);
    Nan::SetPrototypeMethod(tpl, "openTCP", OpenTCP);
    Nan::SetPrototypeMethod(tpl, "close", Close);
    Nan::SetPrototypeMethod(tpl, "get", Get);
    Nan::SetPrototypeMethod(tpl, "scan", ScanSecondary);
    Nan::SetPrototypeMethod(tpl, "setPrimaryId", SetPrimaryId);

    v8::Local<v8::Function> function = Nan::GetFunction(tpl).ToLocalChecked();
    constructor.Reset(function);
#if NODE_MAJOR_VERSION > 18
    v8::Local<v8::Context> context = target->GetCreationContextChecked();
#else
    v8::Local<v8::Context> context = target->CreationContext();
#endif
    target->Set(context, Nan::New("MbusMaster").ToLocalChecked(), function);
}

NAN_METHOD(MbusMaster::New) {
    Nan::HandleScope scope;

    // throw an error if constructor is called without new keyword
    if(!info.IsConstructCall()) {
        return Nan::ThrowError(Nan::New("MbusMaster::New - called without new keyword").ToLocalChecked());
    }

    // Invoked as constructor: `new MbusMaster(...)`
    MbusMaster* obj = new MbusMaster();
    obj->Wrap(info.Holder());
    info.GetReturnValue().Set(info.Holder());
}

NAN_METHOD(MbusMaster::OpenTCP) {
    Nan::HandleScope scope;

    MbusMaster* obj = node::ObjectWrap::Unwrap<MbusMaster>(info.This());

    int port = (long)Nan::To<int64_t>(info[1]).FromJust();
    char *host = get(Nan::To<v8::String>(info[0]).ToLocalChecked(), "127.0.0.1");
    double timeout = (double)Nan::To<double>(info[2]).FromJust();

    if(!obj->connected) {
        obj->serial = false;
        if ((port < 0) || (port > 0xFFFF))
        {
            free(host);
            info.GetReturnValue().Set(Nan::False());
        }
        if (!(obj->handle = mbus_context_tcp(host,port)))
        {
            free(host);
            info.GetReturnValue().Set(Nan::False());
            return;
        }
        free(host);

        if (timeout > 0.0) {
            mbus_tcp_set_timeout_set(timeout);
        }

        if (mbus_connect(obj->handle) == -1)
        {
            mbus_context_free(obj->handle);
            obj->handle = NULL;
            info.GetReturnValue().Set(Nan::False());
            return;
        }
        obj->connected = true;
        obj->communicationInProgress = false;
        info.GetReturnValue().Set(Nan::True());
        return;
    }
    info.GetReturnValue().Set(Nan::False());
}

NAN_METHOD(MbusMaster::OpenSerial) {
    Nan::HandleScope scope;

    MbusMaster* obj = node::ObjectWrap::Unwrap<MbusMaster>(info.This());

    long boudrate;
    int _boudrate = (int)Nan::To<int64_t>(info[1]).FromJust();
    char *port = get(Nan::To<v8::String>(info[0]).ToLocalChecked(), "/dev/ttyS0");

    switch(_boudrate) {
    case 300:
        boudrate = 300;
        break;
    case 600:
        boudrate = 600;
        break;
    case 1200:
        boudrate = 1200;
        break;
    case 2400:
        boudrate = 2400;
        break;
    case 4800:
        boudrate = 4800;
        break;
    case 9600:
        boudrate = 9600;
        break;
    case 19200:
        boudrate = 19200;
        break;
    case 38400:
        boudrate = 38400;
        break;
    default:
        boudrate = 2400;
        break;
    }

    obj->communicationInProgress = false;
    if(!obj->connected) {
        obj->serial = true;

        if (!(obj->handle = mbus_context_serial(port)))
        {
            free(port);
            info.GetReturnValue().Set(Nan::False());
            return;
        }
        free(port);

        if (mbus_connect(obj->handle) == -1)
        {
            mbus_context_free(obj->handle);
            obj->handle = NULL;
            info.GetReturnValue().Set(Nan::False());
            return;
        }

        if (mbus_serial_set_baudrate(obj->handle, boudrate) == -1)
        {
            mbus_disconnect(obj->handle);
            mbus_context_free(obj->handle);
            obj->handle = NULL;
            info.GetReturnValue().Set(Nan::False());
            return;
        }

        obj->connected = true;
        obj->communicationInProgress = false;
        info.GetReturnValue().Set(Nan::True());
        return;
    }
    info.GetReturnValue().Set(Nan::False());
}

NAN_METHOD(MbusMaster::Close) {
    Nan::HandleScope scope;

    MbusMaster* obj = node::ObjectWrap::Unwrap<MbusMaster>(info.This());

    if(obj->communicationInProgress) {
        info.GetReturnValue().Set(Nan::False());
        return;
    }

    if(obj->connected) {
        mbus_disconnect(obj->handle);
        mbus_context_free(obj->handle);
        obj->handle = NULL;
        obj->connected = false;
        obj->communicationInProgress = false;
        info.GetReturnValue().Set(Nan::True());
    }
    else {
        info.GetReturnValue().Set(Nan::False());
    }
}

static int init_slaves(mbus_handle *handle)
{

    if (mbus_send_ping_frame(handle, MBUS_ADDRESS_NETWORK_LAYER, 1) == -1)
    {
        return 0;
    }

    if (mbus_send_ping_frame(handle, MBUS_ADDRESS_NETWORK_LAYER, 1) == -1)
    {
        return 0;
    }

    return 1;
}

class RecieveWorker : public Nan::AsyncWorker {
public:
    RecieveWorker(Nan::Callback *callback, char *addr_str, bool ping_first, uv_rwlock_t *lock, mbus_handle *handle, bool *communicationInProgress)
    : Nan::AsyncWorker(callback), addr_str(addr_str), ping_first(ping_first), lock(lock), handle(handle), communicationInProgress(communicationInProgress) {}
    ~RecieveWorker() {
        free(addr_str);
    }

    // Executed inside the worker-thread.
    // It is not safe to access V8, or V8 data structures
    // here, so everything we need for input and output
    // should go on `this`.
    void Execute () {
        uv_rwlock_wrlock(lock);

        mbus_frame reply;
        char error[100];
        int address;
        int secondary_selected = 0;

        memset((void *)&reply, 0, sizeof(mbus_frame));

        if (ping_first && init_slaves(handle) == 0)
        {
            sprintf(error, "Failed to init slaves.");
            SetErrorMessage(error);
            uv_rwlock_wrunlock(lock);
            return;
        }

        if (mbus_is_secondary_address(addr_str))
        {
            // secondary addressing

            int ret;

            ret = mbus_select_secondary_address(handle, addr_str);

            if (ret == MBUS_PROBE_COLLISION)
            {
                sprintf(error, "The address mask [%s] matches more than one device.", addr_str);
                SetErrorMessage(error);
                uv_rwlock_wrunlock(lock);
                return;
            }
            else if (ret == MBUS_PROBE_NOTHING)
            {
                sprintf(error, "The selected secondary address does not match any device [%s].", addr_str);
                SetErrorMessage(error);
                uv_rwlock_wrunlock(lock);
                return;
            }
            else if (ret == MBUS_PROBE_ERROR)
            {
                sprintf(error, "Failed to select secondary address [%s].", addr_str);
                SetErrorMessage(error);
                uv_rwlock_wrunlock(lock);
                return;
            }
            else if (ret == MBUS_PROBE_SINGLE)
            {
                secondary_selected = 1;
            }

            address = MBUS_ADDRESS_NETWORK_LAYER;
        }
        else
        {
            // primary addressing
            address = atoi(addr_str);

            if (ping_first)
            {
                // send a reset SND_NKE to the device before requesting data
                // this does not make sense for devices that are accessed by secondary addressing
                // as the reset de-selects the device
                // taken from https://github.com/rscada/libmbus/pull/95
                if (mbus_send_ping_frame(handle, address, 1) == -1)
                {
                    sprintf(error, "Failed to initialize slave[%s].", addr_str);
                    SetErrorMessage(error);

                    // manual free
                    mbus_frame_free((mbus_frame*)reply.next);

                    uv_rwlock_wrunlock(lock);
                    return;
                }
            }
        }

        // instead of the send and recv, use this sendrecv function that
        // takes care of the possibility of multi-telegram replies (limit = 16 frames)
        if (mbus_sendrecv_request(handle, address, &reply, MAXFRAMES) != 0)
        {
            sprintf(error, "Failed to send/receive M-Bus request frame[%s].", addr_str);
            SetErrorMessage(error);

            // manual free
            mbus_frame_free((mbus_frame*)reply.next);

            uv_rwlock_wrunlock(lock);
            return;
        }

        //
        // generate XML
        //
        if ((data = mbus_frame_xml(&reply)) == NULL)
        {
            sprintf(error, "Failed to generate XML representation of MBUS frame [%s].", addr_str);
            SetErrorMessage(error);

            // manual free
            mbus_frame_free((mbus_frame*)reply.next);

            uv_rwlock_wrunlock(lock);
            return;
        }

        // manual free
        mbus_frame_free((mbus_frame*)reply.next);

        uv_rwlock_wrunlock(lock);
    }

    // Executed when the async work is complete
    // this function will be run inside the main event loop
    // so it is safe to use V8 again
    void HandleOKCallback () {
        Nan::HandleScope scope;

        *communicationInProgress = false;

        Local<Value> argv[] = {
            Nan::Null(),
            Nan::New<String>(data).ToLocalChecked()
        };
        free(data);
        callback->Call(2, argv, async_resource);
    };

    void HandleErrorCallback () {
        Nan::HandleScope scope;

        *communicationInProgress = false;

        Local<Value> argv[] = {
            Nan::Error(ErrorMessage())
        };

        callback->Call(1, argv, async_resource);
    }
private:
    char *data;
    char *addr_str;
    bool ping_first;
    uv_rwlock_t *lock;
    mbus_handle *handle;
    bool *communicationInProgress;
};

NAN_METHOD(MbusMaster::Get) {
    Nan::HandleScope scope;

    MbusMaster* obj = node::ObjectWrap::Unwrap<MbusMaster>(info.This());

    char *address = get(Nan::To<v8::String>(info[0]).ToLocalChecked(),"0");
    bool ping_first = Nan::To<bool>(info[1]).FromJust();
    Nan::Callback *callback = new Nan::Callback(info[2].As<Function>());

    if(obj->connected) {
        obj->communicationInProgress = true;

        Nan::AsyncQueueWorker(new RecieveWorker(callback, address, ping_first, &(obj->queueLock), obj->handle, &(obj->communicationInProgress)));
    } else {
        Local<Value> argv[] = {
            Nan::Error("Not connected to port")
        };
        callback->Call(1, argv);
    }
    info.GetReturnValue().SetUndefined();
}

class ScanSecondaryWorker : public Nan::AsyncWorker {
public:
    ScanSecondaryWorker(Nan::Callback *callback,uv_rwlock_t *lock, mbus_handle *handle, bool *communicationInProgress)
    : Nan::AsyncWorker(callback), lock(lock), handle(handle), communicationInProgress(communicationInProgress) {}
    ~ScanSecondaryWorker() {
    }

    //------------------------------------------------------------------------------
    // Iterate over all address masks according to the M-Bus probe algorithm.
    //------------------------------------------------------------------------------
    int
    Scan2ndAddressRange(mbus_handle * handle, int pos, char *addr_mask)
    {
        int i, i_start, i_end, probe_ret;
        char *mask, matching_mask[17];
        char buffer[22];

        if (handle == NULL || addr_mask == NULL)
        {
            MBUS_ERROR("%s: Invalid handle or address mask.\n", __PRETTY_FUNCTION__);
            return -1;
        }

        if (strlen(addr_mask) != 16)
        {
            MBUS_ERROR("%s: Illegal address mask [%s]. Not 16 characters long.\n", __PRETTY_FUNCTION__, addr_mask);
            return -1;
        }

        if (pos < 0 || pos >= 16)
        {
            return 0;
        }

        if ((mask = strdup(addr_mask)) == NULL)
        {
            MBUS_ERROR("%s: Failed to allocate local copy of the address mask.\n", __PRETTY_FUNCTION__);
            return -1;
        }

        if (mask[pos] == 'f' || mask[pos] == 'F')
        {
            // mask[pos] is a wildcard -> enumerate all 0..9 at this position
            i_start = 0;
            i_end   = 9;
        }
        else
        {
            if (pos < 15)
            {
                // mask[pos] is not a wildcard -> don't iterate, recursively check pos+1
                Scan2ndAddressRange(handle, pos+1, mask);
            }
            else
            {
                // .. except if we're at the last pos (==15) and this isn't a wildcard we still need to send the probe
                i_start = (int)(mask[pos] - '0');
                i_end   = (int)(mask[pos] - '0');
            }
        }

        // skip the scanning if we're returning from the (pos < 15) case above
        if (mask[pos] == 'f' || mask[pos] == 'F' || pos == 15)
        {
            for (i = i_start; i <= i_end; i++)
            {
                mask[pos] = '0'+i;

                if (handle->scan_progress)
                    handle->scan_progress(handle,mask);

                probe_ret = mbus_probe_secondary_address(handle, mask, matching_mask);

                if (probe_ret == MBUS_PROBE_SINGLE)
                {
                    //printf("Found a device on secondary address %s [using address mask %s]\n", matching_mask, mask);
                    sprintf(buffer,"\"%s\",",matching_mask);
                    data = (char*)realloc(data, strlen(data) + strlen(buffer) + 2*sizeof(char));
                    if (data) {
                        strcat(data,buffer);
                    }
                }
                else if (probe_ret == MBUS_PROBE_COLLISION)
                {
                    // collision, more than one device matching, restrict the search mask further
                    Scan2ndAddressRange(handle, pos+1, mask);
                }
                else if (probe_ret == MBUS_PROBE_NOTHING)
                {
                     // nothing... move on to next address mask
                }
                else // MBUS_PROBE_ERROR
                {
                    MBUS_ERROR("%s: Failed to probe secondary address [%s].\n", __PRETTY_FUNCTION__, mask);
                    return -1;
                }
            }
        }

        free(mask);
        return 0;
    }

    // Executed inside the worker-thread.
    // It is not safe to access V8, or V8 data structures
    // here, so everything we need for input and output
    // should go on `this`.
    void Execute () {
        uv_rwlock_wrlock(lock);

        mbus_frame *frame = NULL, reply;
        char error[100];
        char mask[17];

        strcpy(mask,"FFFFFFFFFFFFFFFF");

        memset((void *)&reply, 0, sizeof(mbus_frame));

        frame = mbus_frame_new(MBUS_FRAME_TYPE_SHORT);

        if (frame == NULL)
        {
            sprintf(error, "Failed to allocate mbus frame.");
            free(frame);
            uv_rwlock_wrunlock(lock);
            return;
        }

        if (init_slaves(handle) == 0)
        {
            free(frame);
            uv_rwlock_wrunlock(lock);
            return;
        }

        data = strdup("[ ");

        int ret = Scan2ndAddressRange(handle, 0, mask);

        if (ret == -1)
        {
            sprintf(error,"Failed to probe secondary address %s", mask);
            SetErrorMessage(error);
            free(data);
            uv_rwlock_wrunlock(lock);
            return;
        }
        data[strlen(data) - 1] = ']';
        data[strlen(data)] = '\0';
        uv_rwlock_wrunlock(lock);
    }

    // Executed when the async work is complete
    // this function will be run inside the main event loop
    // so it is safe to use V8 again
    void HandleOKCallback () {
        Nan::HandleScope scope;

        *communicationInProgress = false;

        Local<Value> argv[] = {
            Nan::Null(),
            Nan::New<String>(data).ToLocalChecked()
        };
        free(data);
        callback->Call(2, argv, async_resource);
    };

    void HandleErrorCallback () {
        Nan::HandleScope scope;

        *communicationInProgress = false;

        Local<Value> argv[] = {
            Nan::Error(ErrorMessage())
        };
        callback->Call(1, argv, async_resource);
    }
private:
    char *data;
    uv_rwlock_t *lock;
    mbus_handle *handle;
    bool *communicationInProgress;
};

NAN_METHOD(MbusMaster::ScanSecondary) {
    Nan::HandleScope scope;

    MbusMaster* obj = node::ObjectWrap::Unwrap<MbusMaster>(info.This());

    Nan::Callback *callback = new Nan::Callback(info[0].As<Function>());
    if(obj->connected) {
        obj->communicationInProgress = true;

        Nan::AsyncQueueWorker(new ScanSecondaryWorker(callback, &(obj->queueLock), obj->handle, &(obj->communicationInProgress)));
    } else {
        Local<Value> argv[] = {
            Nan::Error("Not connected to port")
        };
        callback->Call(1, argv);
    }
    info.GetReturnValue().SetUndefined();
}

class SetPrimaryWorker : public Nan::AsyncWorker {
public:
    SetPrimaryWorker(Nan::Callback *callback, char *old_addr_str, int new_address, uv_rwlock_t *lock, mbus_handle *handle, bool *communicationInProgress)
    : Nan::AsyncWorker(callback), old_addr_str(old_addr_str), new_address(new_address), lock(lock), handle(handle), communicationInProgress(communicationInProgress) {}
    ~SetPrimaryWorker() {
        free(old_addr_str);
    }

    // Executed inside the worker-thread.
    // It is not safe to access V8, or V8 data structures
    // here, so everything we need for input and output
    // should go on `this`.
    void Execute () {
        uv_rwlock_wrlock(lock);

        mbus_frame reply;
        char error[150];
        int old_address;
        int ret;

        if (mbus_is_primary_address(new_address) == 0)
        {
            sprintf(error, "Invalid new primary address");
            SetErrorMessage(error);
            uv_rwlock_wrunlock(lock);
            return;
        }

        switch (new_address)
        {
            case MBUS_ADDRESS_NETWORK_LAYER:
            case MBUS_ADDRESS_BROADCAST_REPLY:
            case MBUS_ADDRESS_BROADCAST_NOREPLY:
                sprintf(error, "Invalid new primary address");
                SetErrorMessage(error);
                uv_rwlock_wrunlock(lock);
                return;
        }

        if (init_slaves(handle) == 0)
        {
            sprintf(error, "Failed to init slaves.");
            SetErrorMessage(error);
            uv_rwlock_wrunlock(lock);
            return;
        }

        if (mbus_send_ping_frame(handle, new_address, 0) == -1)
        {
            sprintf(error, "Verification failed. Could not send ping frame: %s", mbus_error_str());
            SetErrorMessage(error);
            uv_rwlock_wrunlock(lock);
            return;
        }

        if (mbus_recv_frame(handle, &reply) != MBUS_RECV_RESULT_TIMEOUT)
        {
            sprintf(error, "Verification failed. Got a response from new address");
            SetErrorMessage(error);
            uv_rwlock_wrunlock(lock);
            return;
        }

        if (mbus_is_secondary_address(old_addr_str))
        {
            // secondary addressing

            ret = mbus_select_secondary_address(handle, old_addr_str);

            if (ret == MBUS_PROBE_COLLISION)
            {
                sprintf(error, "The address mask [%s] matches more than one device.", old_addr_str);
                SetErrorMessage(error);
                uv_rwlock_wrunlock(lock);
                return;
            }
            else if (ret == MBUS_PROBE_NOTHING)
            {
                sprintf(error, "The selected secondary address does not match any device [%s].", old_addr_str);
                SetErrorMessage(error);
                uv_rwlock_wrunlock(lock);
                return;
            }
            else if (ret == MBUS_PROBE_ERROR)
            {
                sprintf(error, "Failed to select secondary address [%s].", old_addr_str);
                SetErrorMessage(error);
                uv_rwlock_wrunlock(lock);
                return;
            }

            old_address = MBUS_ADDRESS_NETWORK_LAYER;
        }
        else
        {
            // primary addressing
            old_address = atoi(old_addr_str);
        }

        if (mbus_set_primary_address(handle, old_address, new_address) == -1)
        {
            sprintf(error, "Failed to send set primary address frame: %s", mbus_error_str());
            SetErrorMessage(error);
            uv_rwlock_wrunlock(lock);
            return;
        }

        memset(&reply, 0, sizeof(mbus_frame));
        ret = mbus_recv_frame(handle, &reply);

        if (ret == MBUS_RECV_RESULT_TIMEOUT)
        {
            sprintf(error, "No reply from device");
            SetErrorMessage(error);
            uv_rwlock_wrunlock(lock);
            return;
        }
        else if (mbus_frame_type(&reply) != MBUS_FRAME_TYPE_ACK)
        {
            sprintf(error, "Unknown reply from Device (%d)", mbus_frame_type(&reply));
            //mbus_frame_print(&reply);
            SetErrorMessage(error);
            uv_rwlock_wrunlock(lock);
            return;
        }
        else
        {
            //printf("Set primary address of device to %d", new_address);
            // Success
        }
        uv_rwlock_wrunlock(lock);
    }

    // Executed when the async work is complete
    // this function will be run inside the main event loop
    // so it is safe to use V8 again
    void HandleOKCallback () {
        Nan::HandleScope scope;

        *communicationInProgress = false;

        Local<Value> argv[] = {
            Nan::Null()
        };
        callback->Call(1, argv, async_resource);
    };

    void HandleErrorCallback () {
        Nan::HandleScope scope;

        *communicationInProgress = false;

        Local<Value> argv[] = {
            Nan::Error(ErrorMessage())
        };

        callback->Call(1, argv, async_resource);
    }
private:
    char *old_addr_str;
    int new_address;
    uv_rwlock_t *lock;
    mbus_handle *handle;
    bool *communicationInProgress;
};

NAN_METHOD(MbusMaster::SetPrimaryId) {
    Nan::HandleScope scope;

    MbusMaster* obj = node::ObjectWrap::Unwrap<MbusMaster>(info.This());

    char *oldAddress = get(Nan::To<v8::String>(info[0]).ToLocalChecked(),"0");
    int newAddress = (int)Nan::To<int64_t>(info[1]).FromJust();
    Nan::Callback *callback = new Nan::Callback(info[2].As<Function>());
    if(obj->connected) {
        obj->communicationInProgress = true;

        Nan::AsyncQueueWorker(new SetPrimaryWorker(callback, oldAddress, newAddress, &(obj->queueLock), obj->handle, &(obj->communicationInProgress)));
    } else {
        Local<Value> argv[] = {
            Nan::Error("Not connected to port")
        };
        callback->Call(1, argv);
    }
    info.GetReturnValue().SetUndefined();
}


NAN_GETTER(MbusMaster::HandleGetters) {
    MbusMaster* obj = node::ObjectWrap::Unwrap<MbusMaster>(info.This());

    std::string propertyName = std::string(*Nan::Utf8String(property));
    if (propertyName == "connected") {
        info.GetReturnValue().Set(obj->connected);
    }
    else if (propertyName == "communicationInProgress") {
        info.GetReturnValue().Set(obj->communicationInProgress);
    } else {
        info.GetReturnValue().Set(Nan::Undefined());
    }
}

NAN_SETTER(MbusMaster::HandleSetters) {
}
