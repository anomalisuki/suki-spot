const axios = require("axios");
const crypto = require("crypto");

class Parser {
  _getImg(o) {
    return (o?.sources || []).map((s) => ({
      url: s.url,
      width: s.width || s.maxWidth || null,
      height: s.height || s.maxHeight || null
    }));
  }

  _getLink(uri) {
    if (!uri) return { id: null, url: null, uri: null };
    const p = uri.split(":");
    return {
      uri,
      id: p[2] || null,
      url: p[2] ? `https://open.spotify.com/${p[1]}/${p[2]}` : null
    };
  }

  parseSearch(res, limit = null) {
    if (!res) return null;
    const slice = (arr) =>
      limit && limit > 0 ? (arr || []).slice(0, limit) : (arr || []);

    const parse = (arr, mapFn, isTrack = false, useLimit = false) =>
      (useLimit ? slice(arr) : arr || []).reduce((acc, node) => {
        const d = isTrack ? node.item?.data : node.data;
        if (d) acc.push(mapFn(d));
        return acc;
      }, []);

    const trackItems = res.tracksV2?.items?.length
      ? res.tracksV2.items
      : res.topResultsV2?.itemsV2?.filter(
          (i) => i.item?.__typename === "TrackResponseWrapper"
        );

    return {
      top_results: slice(res.topResultsV2?.itemsV2 || []).reduce((acc, node) => {
        const wrap = node.item;
        const d = wrap?.data;
        if (!d) return acc;
        const type = wrap.__typename?.replace("ResponseWrapper", "") || "Unknown";
        acc.push({
          type,
          ...this._getLink(d.uri),
          name: d.name || d.profile?.name || d.displayName || null,
          images: this._getImg(
            d.coverArt || d.visuals?.avatarImage || d.images?.items?.[0] || d.avatar
          )
        });
        return acc;
      }, []),

      tracks: parse(trackItems, (t) => ({
        ...this._getLink(t.uri),
        name: t.name || null,
        duration_ms: t.duration?.totalMilliseconds || 0,
        explicit: t.contentRating?.label === "EXPLICIT",
        media_type: t.trackMediaType || null,
        playability: {
          playable: !!t.playability?.playable,
          reason: t.playability?.reason || null
        },
        artists: (t.artists?.items || []).map((a) => ({
          ...this._getLink(a.uri),
          name: a.profile?.name
        })),
        album: {
          ...this._getLink(t.albumOfTrack?.uri),
          name: t.albumOfTrack?.name || null,
          images: this._getImg(t.albumOfTrack?.coverArt)
        }
      }), true, true),

      albums: parse(res.albumsV2?.items, (a) => ({
        ...this._getLink(a.uri),
        name: a.name || null,
        type: a.type || null,
        release_year: a.date?.year || null,
        artists: (a.artists?.items || []).map((art) => ({
          ...this._getLink(art.uri),
          name: art.profile?.name
        })),
        images: this._getImg(a.coverArt)
      }), false, true),

      artists: parse(res.artists?.items, (art) => ({
        ...this._getLink(art.uri),
        name: art.profile?.name || null,
        images: this._getImg(art.visuals?.avatarImage)
      }), false, true),

      playlists: parse(res.playlists?.items, (pl) => ({
        ...this._getLink(pl.uri),
        name: pl.name || null,
        description: pl.description || null,
        images: this._getImg(pl.images?.items?.[0]),
        owner: {
          display_name: pl.ownerV2?.data?.name || null,
          username: pl.ownerV2?.data?.username || null
        }
      }))
    };
  }
}

class Spotify {
  constructor() {
    this.cfg = {
      secret: process.env.SPOTIFY_TOTP_SECRET ||
        "376136387538459893883312310911992847112448894410210511297108",
      version: 61,
      client_version: "1.2.88.61.ge172202b",
      query: {
        search: {
          opt: "searchDesktop",
          sha: "21b3fe49546912ba782db5c47e9ef5a7dbd20329520ba0c7d0fcfadee671d24e"
        },
        track: {
          opt: "getTrack",
          sha: "612585ae06ba435ad26369870deaae23b5c8800a256cd8a57e08eddc25a37294"
        }
      }
    };

    this.is = axios.create({
      timeout: 20000,
      headers: {
        referer: "https://open.spotify.com/",
        origin: "https://open.spotify.com",
        "content-type": "application/json",
        accept: "application/json",
        "user-agent":
          "Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/143.0.7499.34 Mobile Safari/537.36"
      }
    });
    this.parser = new Parser();
  }

  generateTOTP(tsms) {
    const counter = Math.floor(tsms / 1000 / 30);
    const buffer = Buffer.alloc(8);
    buffer.writeBigInt64BE(BigInt(counter));
    const digest = crypto.createHmac("sha1", Buffer.from(this.cfg.secret, "utf8"))
      .update(buffer).digest();
    const offset = digest[digest.length - 1] & 0xf;
    const code = (digest.readUInt32BE(offset) & 0x7fffffff) % 1000000;
    return code.toString().padStart(6, "0");
  }

  async getToken() {
    if (this.is.defaults.headers.authorization) return true;

    const sts = Math.floor(Date.now() / 1000);
    const tokenRes = await this.is.get("https://open.spotify.com/api/token", {
      params: {
        reason: "init",
        productType: "web-player",
        totp: this.generateTOTP(Date.now()),
        totpServer: this.generateTOTP(sts * 1000),
        totpVer: String(this.cfg.version)
      }
    });

    const token = tokenRes.data;
    if (!token?.accessToken || !token?.clientId) {
      throw new Error("Spotify token tidak tersedia.");
    }

    const clientRes = await this.is.post(
      "https://clienttoken.spotify.com/v1/clienttoken",
      {
        client_data: {
          client_version: this.cfg.client_version,
          client_id: token.clientId,
          js_sdk_data: {
            device_brand: "unknown",
            device_model: "unknown",
            os: "linux",
            os_version: "24.04",
            device_id: crypto.randomUUID(),
            device_type: "computer"
          }
        }
      }
    );

    const granted = clientRes.data?.granted_token?.token;
    if (!granted) throw new Error("Spotify client token tidak tersedia.");

    Object.assign(this.is.defaults.headers, {
      "accept-language": "en",
      "app-platform": "WebPlayer",
      authorization: `Bearer ${token.accessToken}`,
      "client-token": granted,
      "spotify-app-version": this.cfg.client_version
    });

    return true;
  }

  async query(name, vars) {
    await this.getToken();
    const sel = this.cfg.query[name];
    if (!sel) throw new Error(`Query Spotify '${name}' tidak tersedia.`);

    const { data } = await this.is.post(
      "https://api-partner.spotify.com/pathfinder/v2/query",
      {
        variables: vars,
        operationName: sel.opt,
        extensions: {
          persistedQuery: { version: 1, sha256Hash: sel.sha }
        }
      }
    );
    return data;
  }

  async search(query, limit = 10) {
    const res = await this.query("search", {
      searchTerm: query,
      offset: 0,
      limit: 10,
      numberOfTopResults: 5,
      includeAudiobooks: true,
      includeArtistHasConcertsField: false,
      includePreReleases: true,
      includeAuthors: false,
      includeEpisodeContentRatingsV2: false
    });

    return this.parser.parseSearch(res.data?.searchV2, limit);
  }
}

module.exports = { Spotify, Parser };
