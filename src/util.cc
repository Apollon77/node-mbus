#include "util.h"
#include <cstdlib>
#include <cstring>

char *get(v8::Handle<v8::Value> value, const char *fallback) {
	Nan::NanScope();
	char *str;
    if (value->IsString()) {
        Nan::Utf8String string(value);
        str = strdup(*string);
    } else {
 	   str = strdup(fallback);
	}
    return str;
}
