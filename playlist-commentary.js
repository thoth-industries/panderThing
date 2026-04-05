/**
 * playlist-commentary.js
 * Thoth Industries / Prayer Group X
 * 
 * Fetches commentary JSON from thoth-industries GitHub,
 * console.logs track commentary in the appropriate Unicode voice
 * when a track becomes active.
 * 
 * Completely silent on failure — commentary is a gift to seekers,
 * not a dependency.
 * 
 * Usage:
 *   PlaylistCommentary.init(playlistId);
 *   PlaylistCommentary.onTrack(videoId);  // call when track changes
 */

var PlaylistCommentary = (function() {

  // ── Unicode transliteration tables ──────────────────────────────────────
  // Each table maps a-z (index 0-25) and A-Z (index 26-51)
  // to the corresponding Unicode mathematical character codepoints.
  // Numbers 0-9 mapped where double-struck has them; others pass through.

  var VOICES = {

    fraktur: {
      // 𝔞-𝔷 (U+1D51E - U+1D537), 𝔄-ℨ (mixed, some in Letterlike Symbols)
      lower: [0x1D51E,0x1D51F,0x1D520,0x1D521,0x1D522,0x1D523,0x1D524,0x1D525,
              0x1D526,0x1D527,0x1D528,0x1D529,0x1D52A,0x1D52B,0x1D52C,0x1D52D,
              0x1D52E,0x1D52F,0x1D530,0x1D531,0x1D532,0x1D533,0x1D534,0x1D535,
              0x1D536,0x1D537],
      upper: [0x1D504,0x1D505,0x212D,  0x1D507,0x1D508,0x1D509,0x1D50A,0x210C,
              0x2111,  0x1D50D,0x1D50E,0x1D50F,0x1D510,0x1D511,0x1D512,0x1D513,
              0x1D514,0x211C,  0x1D516,0x1D517,0x1D518,0x1D519,0x1D51A,0x1D51B,
              0x1D51C,0x2128]
    },

    doublestruck: {
      // 𝕒-𝕫 (U+1D552-U+1D56B), 𝔸-ℤ (mixed)
      lower: [0x1D552,0x1D553,0x1D554,0x1D555,0x1D556,0x1D557,0x1D558,0x1D559,
              0x1D55A,0x1D55B,0x1D55C,0x1D55D,0x1D55E,0x1D55F,0x1D560,0x1D561,
              0x1D562,0x1D563,0x1D564,0x1D565,0x1D566,0x1D567,0x1D568,0x1D569,
              0x1D56A,0x1D56B],
      upper: [0x1D538,0x1D539,0x2102,  0x1D53B,0x1D53C,0x1D53D,0x1D53E,0x210D,
              0x1D540,0x1D541,0x1D542,0x1D543,0x1D544,0x2115,  0x1D546,0x2119,
              0x211A,  0x211D,  0x1D54A,0x1D54B,0x1D54C,0x1D54D,0x1D54E,0x1D54F,
              0x1D550,0x2124],
      digits: [0x1D7D8,0x1D7D9,0x1D7DA,0x1D7DB,0x1D7DC,0x1D7DD,0x1D7DE,0x1D7DF,
               0x1D7E0,0x1D7E1]
    },

    script: {
      // 𝒶-𝓏 (U+1D4B6 - some gaps), 𝒜-𝒵
      lower: [0x1D4B6,0x1D4B7,0x1D4B8,0x1D4B9,0x212F,  0x1D4BB,0x210A,  0x1D4BD,
              0x1D4BE,0x1D4BF,0x1D4C0,0x1D4C1,0x1D4C2,0x1D4C3,0x2134,  0x1D4C5,
              0x1D4C6,0x1D4C7,0x1D4C8,0x1D4C9,0x1D4CA,0x1D4CB,0x1D4CC,0x1D4CD,
              0x1D4CE,0x1D4CF],
      upper: [0x1D49C,0x212C,  0x1D49E,0x1D49F,0x2130,  0x2131,  0x1D4A2,0x210B,
              0x2110,  0x1D4A5,0x1D4A6,0x2112,  0x2133,  0x1D4A9,0x1D4AA,0x1D4AB,
              0x1D4AC,0x211B,  0x1D4AE,0x1D4AF,0x1D4B0,0x1D4B1,0x1D4B2,0x1D4B3,
              0x1D4B4,0x1D4B5]
    },

    italic: {
      // 𝑎-𝑧 (U+1D44E - U+1D467), 𝐴-𝑍 (U+1D434 - U+1D44D)
      lower: [0x1D44E,0x1D44F,0x1D450,0x1D451,0x1D452,0x1D453,0x1D454,0x210E,
              0x1D456,0x1D457,0x1D458,0x1D459,0x1D45A,0x1D45B,0x1D45C,0x1D45D,
              0x1D45E,0x1D45F,0x1D460,0x1D461,0x1D462,0x1D463,0x1D464,0x1D465,
              0x1D466,0x1D467],
      upper: [0x1D434,0x1D435,0x1D436,0x1D437,0x1D438,0x1D439,0x1D43A,0x1D43B,
              0x1D43C,0x1D43D,0x1D43E,0x1D43F,0x1D440,0x1D441,0x1D442,0x1D443,
              0x1D444,0x1D445,0x1D446,0x1D447,0x1D448,0x1D449,0x1D44A,0x1D44B,
              0x1D44C,0x1D44D]
    },

    monospace: {
      // 𝚊-𝚣 (U+1D68A - U+1D6A3), 𝙰-𝚉 (U+1D670 - U+1D689)
      lower: [0x1D68A,0x1D68B,0x1D68C,0x1D68D,0x1D68E,0x1D68F,0x1D690,0x1D691,
              0x1D692,0x1D693,0x1D694,0x1D695,0x1D696,0x1D697,0x1D698,0x1D699,
              0x1D69A,0x1D69B,0x1D69C,0x1D69D,0x1D69E,0x1D69F,0x1D6A0,0x1D6A1,
              0x1D6A2,0x1D6A3],
      upper: [0x1D670,0x1D671,0x1D672,0x1D673,0x1D674,0x1D675,0x1D676,0x1D677,
              0x1D678,0x1D679,0x1D67A,0x1D67B,0x1D67C,0x1D67D,0x1D67E,0x1D67F,
              0x1D680,0x1D681,0x1D682,0x1D683,0x1D684,0x1D685,0x1D686,0x1D687,
              0x1D688,0x1D689],
      digits: [0x1D7F6,0x1D7F7,0x1D7F8,0x1D7F9,0x1D7FA,0x1D7FB,0x1D7FC,0x1D7FD,
               0x1D7FE,0x1D7FF]
    }

  };

  // ── Transliteration function ─────────────────────────────────────────────
  function toVoice(text, voiceName) {
    if (!voiceName || voiceName === 'none' || !VOICES[voiceName]) return text;
    var table = VOICES[voiceName];
    var result = '';
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      var code = text.charCodeAt(i);
      // lowercase a-z
      if (code >= 97 && code <= 122) {
        var cp = table.lower[code - 97];
        result += cp ? String.fromCodePoint(cp) : c;
      // uppercase A-Z
      } else if (code >= 65 && code <= 90) {
        var cp = table.upper[code - 65];
        result += cp ? String.fromCodePoint(cp) : c;
      // digits 0-9 (only where table has them)
      } else if (code >= 48 && code <= 57 && table.digits) {
        var cp = table.digits[code - 48];
        result += cp ? String.fromCodePoint(cp) : c;
      // everything else passes through — punctuation, spaces, newlines
      } else {
        result += c;
      }
    }
    return result;
  }

  // ── Module state ─────────────────────────────────────────────────────────
  var _data = null;
  var _defaultColor = '#000000';
  var _fontSize = '12px';
  var _lineHeight = '1.8';
  var _baseUrl = 'https://thoth-industries.github.io/panderThing/playlist-commentary/';

  // ── Init: fetch JSON ─────────────────────────────────────────────────────
function init(playlistId, initialVideoId) {
  if (!playlistId){
    console.log('*');
    return;
  }
  var url = _baseUrl + playlistId + '.json';
  fetch(url)
    .then(function(r) {
      if (!r.ok) throw new Error('not found');
      return r.json();
    })
    .then(function(json) {
      _data = json.tracks || {};
      _defaultColor = json.default_color || '#000000';
      _fontSize = json.console_size || '12px';
      _lineHeight = json.console_line_height || '1.8';
      // fire immediately for the initial track now that data is ready
      if (initialVideoId) onTrack(initialVideoId);
    })
    .catch(function() {
      _data = null;
    });
}

  // ── onTrack: called when a track becomes active ──────────────────────────
  function onTrack(videoId) {
    console.log('onTrack');
    if (!_data || !videoId || !_data[videoId]) {
   //   console.log('---');
        console.log('---', '_data:', _data, 'videoId:', videoId);
      return;
    }
    var entry = _data[videoId];
    var text = toVoice(entry.text || '', entry.voice || 'none');
    var color = entry.color || _defaultColor;
    var style = 'color:' + color + '; font-size:' + _fontSize + '; line-height:' + _lineHeight + ';';
    // separator line in same voice for readability
    var sep = toVoice('— — —', entry.voice || 'none');
    console.log('%c' + sep + '\n' + (entry.title ? entry.title + '\n\n' : '') + text + '\n' + sep, style);
  }

  // ── public API ────────────────────────────────────────────────────────────
  return {
    init: init,
    onTrack: onTrack,
    toVoice: toVoice  // exposed for testing
  };

})();
