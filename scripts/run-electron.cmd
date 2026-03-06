@echo off
set "ELECTRON_RUN_AS_NODE="
pushd "%~dp0.."
"%~dp0..\..\20260226work001\cognitive-training\node_modules\.bin\electron.cmd" .
popd
