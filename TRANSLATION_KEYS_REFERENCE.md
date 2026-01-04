# Translation Keys for MySignPage Updates

Add these two keys to each language JSON file:

## en-US.json
```json
"traditionalPlanet": "Traditional Planet:",
"modernRulingPlanet": "Modern Ruling Planet:"
```

## es-ES.json
```json
"traditionalPlanet": "Planeta Tradicional:",
"modernRulingPlanet": "Planeta Regente Moderno:"
```

## fr-FR.json
```json
"traditionalPlanet": "Planète Traditionnelle:",
"modernRulingPlanet": "Planète Maîtresse Moderne:"
```

## de-DE.json
```json
"traditionalPlanet": "Traditioneller Planet:",
/* "modernRulingPlanet": "Moderner Herrscherplanet:" */
```

## it-IT.json
```json
"traditionalPlanet": "Pianeta Tradizionale:",
"modernRulingPlanet": "Pianeta Dominante Moderno:"
```

## pt-BR.json
```json
"traditionalPlanet": "Planeta Tradicional:",
"modernRulingPlanet": "Planeta Regente Moderno:"
```

## ja-JP.json
```json
"traditionalPlanet": "伝統的惑星:",
"modernRulingPlanet": "現代的支配惑星:"
```

## zh-CN.json
```json
"traditionalPlanet": "传统行星:",
"modernRulingPlanet": "现代主导行星:"
```

---

## Add Location in JSON Structure

These keys should be added under the `mySign` object in each translation file:

```json
{
  "mySign": {
    ...existing keys...
    "traditionalPlanet": "...",
    "modernRulingPlanet": "...",
    ...
  }
}
```

Make sure they're properly comma-separated with other keys!
