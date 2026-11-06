# Carl Bloch source scans

Artist: Carl Bloch (1834-1890), Danish. All files below are in the public domain.

| File | Work | Source (Wikimedia Commons) | License |
|---|---|---|---|
| `sermon-on-the-mount-1877.jpg` | The Sermon on the Mount (1877) | https://commons.wikimedia.org/wiki/File:Bloch-SermonOnTheMount.jpg | Public domain |
| `consolator.jpg` (not yet added) | Consolator | https://commons.wikimedia.org/wiki/File:Carl_Heinrich_Bloch_-_Consolator.jpg | Public domain |

Note: `consolator.jpg` is pending. Wikimedia rate-limited the download (HTTP 429) on 2026-11-06; fetch from
https://upload.wikimedia.org/wikipedia/commons/0/01/Carl_Heinrich_Bloch_-_Consolator.jpg and add it here.

Used for design tests only.

## How the picture tees are made

```
python3 scripts/printful/halftone.py art-sources/bloch/sermon-on-the-mount-1877.jpg print/review/src/bloch-sermon-halftone.png --crop 580,200,1320,900 --width 3400 --drop-sky --fade 0.14 --protect 942,368,36,52 --protect 1128,380,40,52 --protect 1215,380,35,45
node scripts/printful/art-review.mjs behold
```

The Consolator scan is not here yet: Wikimedia rate-limited the download (HTTP 429).
