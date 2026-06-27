#!/bin/bash

echo "Checking Qt..."
qmake --version || echo "Qt not installed"
cmake --version
