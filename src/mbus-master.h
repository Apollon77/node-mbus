#ifndef MBUSMASTER_H
#define MBUSMASTER_H

#include <node.h>
#include <mbus.h>
#include <uv.h>
#include <nan.h>

class MbusMaster : public node::ObjectWrap {
 public:
  static void Init(v8::Handle<v8::Object> module);

 private:
  explicit MbusMaster();
  ~MbusMaster();

  static NAN_METHOD(New);
  static NAN_METHOD(OpenSerial);
  static NAN_METHOD(OpenTCP);
  static NAN_METHOD(Close);
  static NAN_METHOD(ScanSecondary);
  static NAN_METHOD(Get);
  static inline Nan::Persistent<v8::Function> & constructor();
  mbus_handle *handle;
  bool connected;
  uv_rwlock_t queueLock;
  bool serial;
};

#endif
