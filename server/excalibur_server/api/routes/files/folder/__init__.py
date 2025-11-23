from excalibur_server.api.misc import is_debug

from .create import create_directory_endpoint as create_directory_endpoint
from .list import listdir_endpoint as listdir_endpoint
from .listener import directory_changes_listener_endpoint as directory_changes_listener_endpoint

if is_debug():
    from .listener import directory_changes_listener_debug_endpoint as directory_changes_listener_debug_endpoint
