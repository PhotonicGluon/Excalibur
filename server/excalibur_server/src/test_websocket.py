from excalibur_server.src.websocket import WebSocketMsg


def test_websocket_msg():
    msg = WebSocketMsg("Test")
    assert msg.serialize() == {"data": "Test", "binary": False}
    assert WebSocketMsg(**msg.serialize()) == msg

    msg = WebSocketMsg("Test", "OK")
    assert msg.serialize() == {"status": "OK", "data": "Test", "binary": False}
    assert WebSocketMsg(**msg.serialize()) == msg

    msg = WebSocketMsg(b"Test", "OK")
    assert msg.serialize() == {"status": "OK", "data": "VGVzdA==", "binary": True}
    assert WebSocketMsg(**msg.serialize()) == msg

    msg = WebSocketMsg("Test", "ERR")
    assert msg.serialize() == {"status": "ERR", "data": "Test", "binary": False}
    assert WebSocketMsg(**msg.serialize()) == msg

    msg = WebSocketMsg(b"Test", "ERR")
    assert msg.serialize() == {"status": "ERR", "data": "VGVzdA==", "binary": True}
    assert WebSocketMsg(**msg.serialize()) == msg
