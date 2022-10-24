# hermione-mocks

A [hermione](https://github.com/gemini-testing/hermione) plugin that allows you to save/read data dumps from HTTP requests. **Works only with browsers that support the CDP protocol**.

## Installation

```bash
npm install hermione-mocks --save-dev
```

## Usage

* **enabled** (optional) `Boolean` – enable/disable the plugin. By default plugin is disabled;
* **hostsPatterns** (optional) `String[]` - patterns for hosts to intercept requests (example - `https://www.npmjs.com/*`). By default, `baseUrl` + `*` from hermione config is used. (example - `https://www.npmjs.com/*`, if your baseUrl is example - `https://www.npmjs.com/`)
* **browsers** (optional) `string[]` - array of `browserId` (from hermione config) to intercept requests for. Each of them should be using chrome-devtools protocol. Default - `[]`
* **mode** (optional) `"play" | "save" | "create"` - plugin's mode. Default - `"save"`
   - `"play"`: Reads dumps from fs (dumps should exist) 
   - `"save"`: Writes dumps to fs. **Overwrites** existing dumps
   - `"create"`: Writes dumps to fs. **Doesn't overwrite**, existing dumps
* **dumpsDir** (optional) `string | (test: Hermione.Test) => string` -  dumps' directory. Default - `"hermione-dumps"`
   - `string`: (ex: `"hermione-dumps"`). All your dumps will be located in `hermione-dumps` in the root of the project.
   - `(test: Hermione.Test) => string`: (ex: `path.join(path.dirname(test.file), "hermione-dumps")`. `hermione-dumps` directories will be located next to each hermione test). Saves tests' dumps to directories by path, returned by the function

Also there is ability to override plugin parameters by CLI options or environment variables (see [configparser](https://github.com/gemini-testing/configparser)).

Use `mocks_` prefix for the environment variables and `--dumps-` for the cli options.

* Add `hermione-mocks` plugin to your `hermione` config file:
```js
// .hermione.conf.js
module.exports = {
    plugins: {
        'hermione-mocks': {
            enabled: true,
            hostsPatterns: ['https://www.npmjs.com/*'],
            browsers: ['chrome'],
            mode: "save",
            dumpsDir: "hermione-dumps"
        },

        // other hermione plugins...
    },

    // other hermione settings...
}
```

## Testing

Run [jest](https://jestjs.io) tests:
```bash
npm run unit
```

Run [eslint](http://eslint.org) codestyle verification
```bash
npm run lint
```

