# Madi DMG build settings consumed by dmgbuild.
#
# This writes Finder metadata directly into the image, avoiding AppleScript and
# Finder timing/cache issues when arranging the installer window.

import os

app_path = os.environ["DMG_APP_PATH"]
app_name = os.path.basename(app_path)

window_w = int(os.environ.get("DMG_WINDOW_W", "640"))
window_h = int(os.environ.get("DMG_WINDOW_H", "420"))
app_icon_x = int(os.environ.get("DMG_APP_ICON_X", "170"))
app_icon_y = int(os.environ.get("DMG_APP_ICON_Y", "230"))
apps_icon_x = int(os.environ.get("DMG_APPS_ICON_X", "470"))
apps_icon_y = int(os.environ.get("DMG_APPS_ICON_Y", "230"))

background_path = os.environ.get("DMG_BACKGROUND_PNG", "")
if background_path and not os.path.isfile(background_path):
    background_path = ""

volume_icon_path = os.environ.get("DMG_VOLUME_ICON", "")
if volume_icon_path and not os.path.isfile(volume_icon_path):
    volume_icon_path = ""

format = "UDZO"
compression_level = 9
filesystem = "HFS+"
size = None

files = [app_path]
symlinks = {"Applications": "/Applications"}

window_rect = ((220, 140), (window_w, window_h))
default_view = "icon-view"
show_icon_preview = False
show_toolbar = False
show_statusbar = False
show_pathbar = False
show_sidebar = False
sidebar_width = 180
icon_size = 104
text_size = 13
include_icon_view_settings = "auto"
include_list_view_settings = "auto"

icon_locations = {
    app_name: (app_icon_x, app_icon_y),
    "Applications": (apps_icon_x, apps_icon_y),
}

background = background_path if background_path else "builtin-arrow"

if volume_icon_path:
    icon = volume_icon_path

license = None
