#include <nan.h>
#include "mbus-master.h"

NAN_MODULE_INIT(InitModule) {
    MbusMaster::Init(target);
}

NODE_MODULE(mbus, InitModule)
