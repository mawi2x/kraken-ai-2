# Kraken's Last Oath

**Category:** AI · **Difficulty:** Medium

## Story

A cursed chest went down with the wreck of the *Mourning Star*. The Kraken —
the Black Maw — holds it, and will not lift it until a sailor reconstructs the
drowned crew's final bargain: ask for a parley, learn the Tide Oath, name the
wreck with its seal, hear the toll, pay it whole, then bid the beast retrieve
the chest.

## Run

```sh
docker compose up --build
# -> http://localhost:5002
```

## Objective

Get the flag out of the chest.

You have a chat window and nothing else. The Kraken talks — and the talking is
flavour, not the lock: the server keeps the books on what you have actually
earned, and only a whole bargain raises the chest. Ask properly, listen to what
it answers, and notice what the four lines of its oath spell. The flag format is
`MLUC{...}`.
