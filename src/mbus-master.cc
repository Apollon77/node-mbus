#include "mbus-master.h"
#include "util.h"

#ifdef _WIN32
#define __PRETTY_FUNCTION__ __FUNCSIG__
#else
#include <unistd.h>
#endif

#define MBUS_ERROR(...) fprintf (stderr, __VA_ARGS__)

using namespace v8;

Nan::Persistent<v8::FunctionTemplate> MbusMaster::constructor;




class ScanSecondaryDatastore
{
public:
	ScanSecondaryDatastore()
	{
        data = strdup("[ ");
	}

    ~ScanSecondaryDatastore()
	{
        free(data);
	}

	void DeviceFound(mbus_handle *handle, mbus_frame *frame)
	{
        MBUS_ERROR("%s: CALLED1.\n", __PRETTY_FUNCTION__);
		char buffer[22], matching_addr[17];
        MBUS_ERROR("%s: CALLED2.\n", __PRETTY_FUNCTION__);
        char *addr = mbus_frame_get_secondary_address(frame);

        snprintf(matching_addr, 17, "%s", addr);

        sprintf(buffer,"\"%s\",",matching_addr);
        MBUS_ERROR("%s: CALLED3.\n", __PRETTY_FUNCTION__);
        data = (char*)realloc(data, strlen(data) + strlen(buffer) + 2*sizeof(char));
        if (data) {
            MBUS_ERROR("%s: CALLED4.\n", __PRETTY_FUNCTION__);
            strcat(data,buffer);
            MBUS_ERROR("%s: CALLED5.\n", __PRETTY_FUNCTION__);
        }
        MBUS_ERROR("%s: CALLED6.\n", __PRETTY_FUNCTION__);
	}

    char* GetData() {
        data[strlen(data) - 1] = ']';
        data[strlen(data)] = '\0';

        return strdup(data);
    }
private:
	char *data;
};

typedef void (*LPFN_DeviceFoundCCallback)(mbus_handle *handle, mbus_frame *frame);
typedef void (ScanSecondaryDatastore::*LPFN_DeviceFoundMemberFunctionCallback)(mbus_handle *handle, mbus_frame *frame);

// this object holds the state for a C++ member function callback in memory
class DeviceFoundCallbackBase
{
public:
	// input: pointer to a unique C callback.
	DeviceFoundCallbackBase(LPFN_DeviceFoundCCallback pCCallback)
		:	m_pClass( NULL ),
			m_pMethod( NULL ),
			m_pCCallback( pCCallback )
	{
	}

	// when done, remove allocation of the callback
	void Free()
	{
		m_pClass = NULL;
		// not clearing m_pMethod: it won't be used, since m_pClass is NULL and so this entry is marked as free
	}

	// when free, allocate this callback
	LPFN_DeviceFoundCCallback Reserve(ScanSecondaryDatastore* instance, LPFN_DeviceFoundMemberFunctionCallback method)
	{
		if( m_pClass )
			return NULL;

		m_pClass = instance;
		m_pMethod = method;
		return m_pCCallback;
	}

protected:
	static void StaticInvoke(int context, mbus_handle *handle, mbus_frame *frame);

private:
	LPFN_DeviceFoundCCallback m_pCCallback;
	ScanSecondaryDatastore* m_pClass;
	LPFN_DeviceFoundMemberFunctionCallback m_pMethod;
};

template <int context> class DynamicDeviceFoundCallback : public DeviceFoundCallbackBase
{
public:
	DynamicDeviceFoundCallback()
		:	DeviceFoundCallbackBase(&DynamicDeviceFoundCallback<context>::GeneratedStaticFunction)
	{
	}

private:
	static void GeneratedStaticFunction(mbus_handle *handle, mbus_frame *frame)
	{
		StaticInvoke(context, handle, frame);
	}
};

class DeviceFoundMemberFunctionCallback
{
public:
	DeviceFoundMemberFunctionCallback(ScanSecondaryDatastore* instance, LPFN_DeviceFoundMemberFunctionCallback method);
	~DeviceFoundMemberFunctionCallback();

public:
	operator LPFN_DeviceFoundCCallback() const
	{
		return m_cbCallback;
	}

	bool IsValid() const
	{
		return m_cbCallback != NULL;
	}

private:
	LPFN_DeviceFoundCCallback m_cbCallback;
	int m_nAllocIndex;

private:
	DeviceFoundMemberFunctionCallback( const DeviceFoundMemberFunctionCallback& os );
	DeviceFoundMemberFunctionCallback& operator=( const DeviceFoundMemberFunctionCallback& os );
};

static DeviceFoundCallbackBase* AvailableCallbackSlots[] = {
	new DynamicDeviceFoundCallback<0x00>()
};

void DeviceFoundCallbackBase::StaticInvoke(int context, mbus_handle *handle, mbus_frame *frame)
{
	((AvailableCallbackSlots[context]->m_pClass)->*(AvailableCallbackSlots[context]->m_pMethod))(handle, frame);
}


DeviceFoundMemberFunctionCallback::DeviceFoundMemberFunctionCallback(ScanSecondaryDatastore* instance, LPFN_DeviceFoundMemberFunctionCallback method)
{
	int imax = sizeof(AvailableCallbackSlots)/sizeof(AvailableCallbackSlots[0]);
	for( m_nAllocIndex = 0; m_nAllocIndex < imax; ++m_nAllocIndex )
	{
		m_cbCallback = AvailableCallbackSlots[m_nAllocIndex]->Reserve(instance, method);
		if( m_cbCallback != NULL )
			break;
	}
}

DeviceFoundMemberFunctionCallback::~DeviceFoundMemberFunctionCallback()
{
	if( IsValid() )
	{
		AvailableCallbackSlots[m_nAllocIndex]->Free();
	}
}









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
    Local<FunctionTemplate> ctor = Nan::New<FunctionTemplate>(MbusMaster::New);
    constructor.Reset(ctor);
    ctor->InstanceTemplate()->SetInternalFieldCount(1);
    ctor->SetClassName(Nan::New("MbusMaster").ToLocalChecked());

    // link our getters and setter to the object property
    Nan::SetAccessor(ctor->InstanceTemplate(), Nan::New("connected").ToLocalChecked(), MbusMaster::HandleGetters, MbusMaster::HandleSetters);
    Nan::SetAccessor(ctor->InstanceTemplate(), Nan::New("communicationInProgress").ToLocalChecked(), MbusMaster::HandleGetters, MbusMaster::HandleSetters);

    // Prototype
    Nan::SetPrototypeMethod(ctor, "openSerial", OpenSerial);
    Nan::SetPrototypeMethod(ctor, "openTCP", OpenTCP);
    Nan::SetPrototypeMethod(ctor, "close", Close);
    Nan::SetPrototypeMethod(ctor, "get", Get);
    Nan::SetPrototypeMethod(ctor, "scan", ScanSecondary);
    Nan::SetPrototypeMethod(ctor, "setPrimaryId", SetPrimaryId);

    target->Set(Nan::New("MbusMaster").ToLocalChecked(), ctor->GetFunction());
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

    MbusMaster* obj = Nan::ObjectWrap::Unwrap<MbusMaster>(info.This());

    int port = (long)info[1]->IntegerValue();
    char *host = get(info[0]->ToString(), "127.0.0.1");
    double timeout = (double)info[2]->NumberValue();

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

    MbusMaster* obj = Nan::ObjectWrap::Unwrap<MbusMaster>(info.This());

    long boudrate;
    int _boudrate = info[1]->IntegerValue();
    char *port = get(info[0]->ToString(), "/dev/ttyS0");

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

    MbusMaster* obj = Nan::ObjectWrap::Unwrap<MbusMaster>(info.This());

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
    RecieveWorker(Nan::Callback *callback,char *addr_str,uv_rwlock_t *lock, mbus_handle *handle, bool *communicationInProgress)
    : Nan::AsyncWorker(callback), addr_str(addr_str), lock(lock), handle(handle), communicationInProgress(communicationInProgress) {}
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
        mbus_frame_data reply_data;
        char error[100];
        int address;

        memset((void *)&reply, 0, sizeof(mbus_frame));
        memset((void *)&reply_data, 0, sizeof(mbus_frame_data));

        if (init_slaves(handle) == 0)
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
            // else MBUS_PROBE_SINGLE

            address = MBUS_ADDRESS_NETWORK_LAYER;
        }
        else
        {
            // primary addressing
            address = atoi(addr_str);
        }

        if (mbus_send_request_frame(handle, address) == -1)
        {
            sprintf(error, "Failed to send M-Bus request frame[%s].", addr_str);
            SetErrorMessage(error);
            uv_rwlock_wrunlock(lock);
            return;
        }

        if (mbus_recv_frame(handle, &reply) != MBUS_RECV_RESULT_OK)
        {
            sprintf(error, "Failed to receive M-Bus response frame[%s].", addr_str);
            SetErrorMessage(error);
            uv_rwlock_wrunlock(lock);
            return;
        }

        //
        // parse data
        //
        if (mbus_frame_data_parse(&reply, &reply_data) == -1)
        {
            sprintf(error, "M-bus data parse error [%s].", addr_str);
            SetErrorMessage(error);

            // manual free
            if (reply_data.data_var.record != NULL)
            {
                mbus_data_record_free(reply_data.data_var.record);
                reply_data.data_var.record = NULL;
            }

            uv_rwlock_wrunlock(lock);
            return;
        }

        //
        // generate XML
        //
        if ((data = mbus_frame_data_xml(&reply_data)) == NULL)
        {
            sprintf(error, "Failed to generate XML representation of MBUS frame [%s].", addr_str);
            SetErrorMessage(error);

            // manual free
            if (reply_data.data_var.record != NULL)
            {
                mbus_data_record_free(reply_data.data_var.record);
                reply_data.data_var.record = NULL;
            }

            uv_rwlock_wrunlock(lock);
            return;
        }

        // manual free
        if (reply_data.data_var.record != NULL)
        {
            mbus_data_record_free(reply_data.data_var.record);
            reply_data.data_var.record = NULL;
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
            Nan::Null(),
            Nan::New<String>(data).ToLocalChecked()
        };
        free(data);
        callback->Call(2, argv);
    };

    void HandleErrorCallback () {
        Nan::HandleScope scope;

        *communicationInProgress = false;

        Local<Value> argv[] = {
            Nan::Error(ErrorMessage())
        };

        callback->Call(1, argv);
    }
private:
    char *data;
    char *addr_str;
    uv_rwlock_t *lock;
    mbus_handle *handle;
    bool *communicationInProgress;
};

NAN_METHOD(MbusMaster::Get) {
    Nan::HandleScope scope;

    MbusMaster* obj = Nan::ObjectWrap::Unwrap<MbusMaster>(info.This());

    char *address = get(info[0]->ToString(),"0");
    Nan::Callback *callback = new Nan::Callback(info[1].As<Function>());
    if(obj->connected) {
        obj->communicationInProgress = true;

        Nan::AsyncQueueWorker(new RecieveWorker(callback, address, &(obj->queueLock), obj->handle, &(obj->communicationInProgress)));
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

/*    void ScanSecondaryWorker::DeviceFound(mbus_handle *handle, mbus_frame *frame)
	{
        MBUS_ERROR("%s: CALLED1.\n", __PRETTY_FUNCTION__);
		char buffer[22], matching_addr[17];
        MBUS_ERROR("%s: CALLED2.\n", __PRETTY_FUNCTION__);
        char *addr = mbus_frame_get_secondary_address(frame);

        snprintf(matching_addr, 17, "%s", addr);

        sprintf(buffer,"\"%s\",",matching_addr);
        MBUS_ERROR("%s: CALLED3.\n", __PRETTY_FUNCTION__);
        data = (char*)realloc(data, strlen(data) + strlen(buffer) + 2*sizeof(char));
        if (data) {
            MBUS_ERROR("%s: CALLED4.\n", __PRETTY_FUNCTION__);
            strcat(data,buffer);
            MBUS_ERROR("%s: CALLED5.\n", __PRETTY_FUNCTION__);
        }
        MBUS_ERROR("%s: CALLED6.\n", __PRETTY_FUNCTION__);
	}*/

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

        //data = strdup("[ ");

        ScanSecondaryDatastore datastore();
        mbus_register_found_event(handle, DeviceFoundMemberFunctionCallback(datastore, &ScanSecondaryDatastore::DeviceFound));


        int ret = mbus_scan_2nd_address_range(handle, 0, mask);

        if (ret == -1)
        {
            sprintf(error,"Failed to probe secondary address", mask);
            SetErrorMessage(error);
            free(data);
            uv_rwlock_wrunlock(lock);
            return;
        }
        data = datastore.GetData();
        //data[strlen(data) - 1] = ']';
        //data[strlen(data)] = '\0';
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
        callback->Call(2, argv);
    };

    void HandleErrorCallback () {
        Nan::HandleScope scope;

        *communicationInProgress = false;

        Local<Value> argv[] = {
            Nan::Error(ErrorMessage())
        };
        callback->Call(1, argv);
    }

private:
    char *data;
    uv_rwlock_t *lock;
    mbus_handle *handle;
    bool *communicationInProgress;
};

NAN_METHOD(MbusMaster::ScanSecondary) {
    Nan::HandleScope scope;

    MbusMaster* obj = Nan::ObjectWrap::Unwrap<MbusMaster>(info.This());

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
        callback->Call(1, argv);
    };

    void HandleErrorCallback () {
        Nan::HandleScope scope;

        *communicationInProgress = false;

        Local<Value> argv[] = {
            Nan::Error(ErrorMessage())
        };

        callback->Call(1, argv);
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

    MbusMaster* obj = Nan::ObjectWrap::Unwrap<MbusMaster>(info.This());

    char *oldAddress = get(info[0]->ToString(),"0");
    int newAddress = (int)info[1]->IntegerValue();
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
    MbusMaster* obj = Nan::ObjectWrap::Unwrap<MbusMaster>(info.This());

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
