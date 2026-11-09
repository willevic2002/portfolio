#!/usr/bin/env bash
# Runs all tests; non-zero exit if any fail.
cd "$(dirname "$0")" || exit 1
rc=0
python3 test_static.py || rc=1
python3 test_browser.py || rc=1
exit $rc
