# Public-domain source paintings for the picture tees

All works below are in the public domain (artists died before 1912; faithful scans of 2-D public-domain art are not copyrightable in the US). Copies came from Eli's Google Drive folder "Shirt Painting", downloaded from Wikimedia Commons.

| File | Work | Artist | Commons page | Used on |
|---|---|---|---|---|
| bloch-consolator.jpg | Consolator | Carl Bloch (1834–1890) | https://commons.wikimedia.org/wiki/File:Carl_Heinrich_Bloch_-_Consolator.jpg | Mercy (3 Nephi 9:14) |
| bloch-little-children.jpg | Let the Little Children Come unto Jesus | Carl Bloch | https://commons.wikimedia.org/wiki/File:Let_the_Little_Children_Come_unto_Jesus.jpg | Come Unto Christ (Moroni 10:32) |
| bloch-christ-and-child.jpg | Christ and Child (crop) | Carl Bloch | https://commons.wikimedia.org/wiki/File:Carl_Bloch_-_Christ_and_Child_(crop).jpg | We Talk of Christ (2 Nephi 25:26) |
| bloch-gethsemane.jpg | Christ in Gethsemane | Carl Bloch | https://commons.wikimedia.org/wiki/File:Gethsemane_Carl_Bloch.jpg | None Other Name (2 Nephi 25:20) |
| rembrandt-storm.jpg | The Storm on the Sea of Galilee (1633) | Rembrandt (1606–1669) | https://commons.wikimedia.org/wiki/File:Rembrandt_Christ_in_the_Storm_on_the_Lake_of_Galilee.jpg | Sure Foundation (Helaman 5:12) |
| bierstadt-rocky-storm.jpg | A Storm in the Rocky Mountains, Mt. Rosalie (1866) | Albert Bierstadt (1830–1902) | https://commons.wikimedia.org/wiki/File:Albert_Bierstadt_-_A_Storm_in_the_Rocky_Mountains,_Mt._Rosalie_-_Google_Art_Project.jpg | Mount Shelem (Ether 3:4) |
| aivazovsky-ninth-wave.jpg | The Ninth Wave (1850) | Ivan Aivazovsky (1817–1900) | https://commons.wikimedia.org/wiki/File:Hovhannes_Aivazovsky_-_The_Ninth_Wave_-_Google_Art_Project.jpg | Nephi's Ship (1 Nephi 17:8) |
| friedrich-lone-tree.jpg | The Lone Tree (1822) | Caspar David Friedrich (1774–1840) | https://commons.wikimedia.org/wiki/File:Caspar_David_Friedrich_-_Village_Landscape_in_Morning_Light_(The_Lone_Tree)_-_WGA8265.jpg | Tree of Life (1 Nephi 8:10) |

Still to get: Bloch's Transfiguration (Light), Bloch's Resurrection (Hosanna), Hofmann's Christ and the Rich Young Ruler (Son of God; the Drive copy is over Drive's 10 MB download limit).

## Commands

```
H="python3 scripts/printful/halftone.py"
$H art-sources/pd/bloch-consolator.jpg print/review/src/bloch-consolator-halftone.png --crop 0,0,1000,820 --width 3400 --drop-sky --oval --fade 0.16
$H art-sources/pd/bloch-little-children.jpg print/review/src/bloch-little-children-halftone.png --crop 200,380,860,1110 --width 3400 --oval --fade 0.16
$H art-sources/pd/bloch-christ-and-child.jpg print/review/src/bloch-christ-and-child-halftone.png --crop 40,0,827,1050 --width 3400 --fade 0.12
$H art-sources/pd/bloch-gethsemane.jpg print/review/src/bloch-gethsemane-halftone.png --crop 400,600,2003,2050 --width 3400 --fade 0.14
$H art-sources/pd/rembrandt-storm.jpg print/review/src/rembrandt-storm-halftone.png --crop 0,600,3002,3600 --width 3400 --oval --fade 0.16
$H art-sources/pd/bierstadt-rocky-storm.jpg print/review/src/bierstadt-mountain-halftone.png --crop 1000,0,5200,3319 --width 3400 --oval --fade 0.16
$H art-sources/pd/aivazovsky-ninth-wave.jpg print/review/src/aivazovsky-wave-halftone.png --crop 500,1300,4900,3420 --width 3400 --oval --fade 0.16 --gamma 1.15
$H art-sources/pd/friedrich-lone-tree.jpg print/review/src/friedrich-tree-halftone.png --crop 250,150,850,810 --width 3400 --drop-sky --oval --fade 0.16
node scripts/printful/art-review.mjs picture
```
