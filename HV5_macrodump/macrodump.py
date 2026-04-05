import evdev
import time
import sys
e = evdev.ecodes
ecodes = evdev.ecodes.ecodes

SLEEP = 0.05
KEYMAP = {
  "~": [e.KEY_LEFTSHIFT, e.KEY_GRAVE],
  
  "!": [e.KEY_LEFTSHIFT, e.KEY_1],
  "@": [e.KEY_LEFTSHIFT, e.KEY_2],
  "#": [e.KEY_LEFTSHIFT, e.KEY_3],
  "$": [e.KEY_LEFTSHIFT, e.KEY_4],
  "%": [e.KEY_LEFTSHIFT, e.KEY_5],
  "^": [e.KEY_LEFTSHIFT, e.KEY_6],
  "&": [e.KEY_LEFTSHIFT, e.KEY_7],
  "*": [e.KEY_LEFTSHIFT, e.KEY_8],
  "(": [e.KEY_LEFTSHIFT, e.KEY_9],
  ")": [e.KEY_LEFTSHIFT, e.KEY_0],
  
  "-": [e.KEY_MINUS],
  "=": [e.KEY_EQUAL],
  "_": [e.KEY_LEFTSHIFT, e.KEY_MINUS],
  "+": [e.KEY_LEFTSHIFT, e.KEY_EQUAL],
  
  "[": [e.KEY_LEFTBRACE],
  "]": [e.KEY_RIGHTBRACE],
  "{": [e.KEY_LEFTSHIFT, e.KEY_LEFTBRACE],
  "}": [e.KEY_LEFTSHIFT, e.KEY_RIGHTBRACE],
  "\\": [e.KEY_BACKSLASH],
  "|": [e.KEY_LEFTSHIFT, e.KEY_BACKSLASH],
  
  ";": [e.KEY_SEMICOLON],
  ":": [e.KEY_LEFTSHIFT, e.KEY_SEMICOLON],
  "'": [e.KEY_APOSTROPHE],
  "\"": [e.KEY_LEFTSHIFT, e.KEY_APOSTROPHE],
  
  ".": [e.KEY_DOT],
  ">": [e.KEY_LEFTSHIFT, e.KEY_DOT],
  ",": [e.KEY_COMMA],
  "<": [e.KEY_LEFTSHIFT, e.KEY_COMMA],
  "/": [e.KEY_SLASH],
  "?": [e.KEY_LEFTSHIFT, e.KEY_SLASH],
  
  "\n": [e.KEY_ENTER],
  " ": [e.KEY_SPACE]
}

for c in "abcdefghijklmnopqrstuvwxyz":
  KEYMAP[c] = [ecodes["KEY_" + c.upper()]]
  KEYMAP[c.upper()] = [e.KEY_LEFTSHIFT, ecodes["KEY_" + c.upper()]]
for c in "0123456789":
  KEYMAP[c] = [ecodes["KEY_" + c]]

ui = evdev.UInput()

time.sleep(5)
print("Outputting...")

with open(sys.argv[1]) as fp:
  file = fp.read()
  for c in file:
    if c not in KEYMAP:
      print(f"warn: {c} not in keymap")
    keys = KEYMAP[c]
    for k in keys:
      ui.write(e.EV_KEY, k, 1)
      ui.syn()
      time.sleep(SLEEP)
    for k in keys:
      ui.write(e.EV_KEY, k, 0)
    ui.syn()
    time.sleep(SLEEP)

ui.close()