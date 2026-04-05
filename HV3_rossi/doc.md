# Docs

## `rossi.hasConsole: boolean`

True if a GPU and screen were detected.

## `rossi.gpu: GPU | nil`

If `rossi.hasConsole` is true, this is the GPU. Nil otherwise.

## `rossi.screen: Screen | nil`

If `rossi.hasConsole` is true, this is the screen. Nil otherwise.

## `rossi.print(msg: string)`

Prints a message to the screen if it exists.