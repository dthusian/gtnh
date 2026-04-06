# Docs

## Logging
- `rossi.hasConsole: boolean` True if a GPU and screen were detected.
- `rossi.print(msg: string)` Prints a message to the log file, and to the screen, if it exists.
- `rossi.console_print(msg: string)` Prints a message only to the screen, if it exists.

## Bootdisk Access
- `rossi.bootdisk: Filesystem` Filesystem component
- `rossi.readfile(path: string): string` Reads the entire contents of a file.
- `rossi.loadfile(path: string): function` Loads the contents of a file as a lua chunk.

## Misc
- `rossi.sleep(sec: number)` Idles for the specified amount of time.
- `rossi.halt()` Stops the machine. This does not shutdown the machine,
  and can be used for reporting errors on screne.