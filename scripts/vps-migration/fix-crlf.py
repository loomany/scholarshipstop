#!/usr/bin/env python3
import sys
src, dst = sys.argv[1], sys.argv[2]
data = open(src, 'rb').read()
if data.startswith(b'\xef\xbb\xbf'):
    data = data[3:]
open(dst, 'wb').write(data.replace(b'\r\n', b'\n'))
