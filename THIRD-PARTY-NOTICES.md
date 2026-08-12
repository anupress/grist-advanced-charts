# Third-party notices

Advanced Charts bundles the libraries below under `vendor/`, and ships them as part of the widget.
Each one's licence requires its copyright notice to travel with the code; Apache-2.0 additionally
requires a copy of the licence itself. This file carries both.

Nothing here changes the licence of the ANUPRESS source, which is MIT — see `LICENSE`.

---

## Apache ECharts 5.6.0

`vendor/echarts.min.js` — <https://echarts.apache.org/>
Copyright The Apache Software Foundation.
Licensed under the **Apache License, Version 2.0**.

Apache ECharts is an Apache Software Foundation project. Its NOTICE file records:

> Apache ECharts
> Copyright 2017-2024 The Apache Software Foundation
>
> This product includes software developed at
> The Apache Software Foundation (https://www.apache.org/).

The full licence text is at <https://www.apache.org/licenses/LICENSE-2.0>, and is reproduced in
`vendor/LICENSE-Apache-2.0.txt`.

## Grist Plugin API

`vendor/grist-plugin-api.js` — <https://github.com/gristlabs/grist-core>
Copyright Grist Labs Inc.
Licensed under the **Apache License, Version 2.0** (see the same licence text as above).

## Leaflet 1.9.4

`vendor/leaflet.js`, `vendor/leaflet.css`, `vendor/images/` — <https://leafletjs.com/>
Copyright (c) 2010-2023, Volodymyr Agafonkin
Copyright (c) 2010-2011, CloudMade
Licensed under the **BSD 2-Clause "Simplified" License**:

> Redistribution and use in source and binary forms, with or without modification, are permitted
> provided that the following conditions are met:
>
> 1. Redistributions of source code must retain the above copyright notice, this list of conditions
>    and the following disclaimer.
> 2. Redistributions in binary form must reproduce the above copyright notice, this list of
>    conditions and the following disclaimer in the documentation and/or other materials provided
>    with the distribution.
>
> THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR
> IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
> FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR
> CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
> DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
> DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
> IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT
> OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

## Leaflet.markercluster

`vendor/leaflet.markercluster.js`, `vendor/MarkerCluster.css`, `vendor/MarkerCluster.Default.css`
<https://github.com/Leaflet/Leaflet.markercluster>
Copyright 2012-2017 David Leaver
Licensed under the **MIT License** (text below).

The bundle also incorporates:

- QuickHull.js — Copyright 2012, the authors listed at
  <https://github.com/Leaflet/Leaflet.markercluster/blob/master/src/MarkerCluster.QuickHull.js> (MIT)
- Spiderfier — Copyright 2011-2012 George MacKerron (MIT)

> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
> associated documentation files (the "Software"), to deal in the Software without restriction,
> including without limitation the rights to use, copy, modify, merge, publish, distribute,
> sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or
> substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
> NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
> NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
> DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT
> OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

**Note on this file specifically:** the minified build we ship had its copyright banner stripped by
the minifier. This notice restores the attribution the MIT licence requires.

## Sortable 1.15.3

`vendor/Sortable.min.js` — <https://github.com/SortableJS/Sortable>
Copyright (c) 2019 All contributors to Sortable
Licensed under the **MIT License** (same text as above).

---

# Map tile services

The Map block fetches tiles from public map servers at view time. Tiles are not bundled and are not
served by ANUPRESS; requests go directly from the viewer's browser to the provider, which means the
provider can see the viewer's IP address and the area being viewed. No table data is sent.

- **OpenStreetMap** — © OpenStreetMap contributors. Map data is available under the
  [Open Database License](https://www.openstreetmap.org/copyright). Tiles are served subject to the
  [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/).
- **OpenTopoMap** — map data © OpenStreetMap contributors, rendering
  © [OpenTopoMap](https://opentopomap.org/), licensed CC-BY-SA.
