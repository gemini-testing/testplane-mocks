# hermione-mocks

A [hermione](https://github.com/gemini-testing/hermione) plugin that allows you to save/read data dumps from network requests. 

This can increase the stability of tests, allows testing time-dependent scenarios, and reduces the load on the server.

**Works only with browsers that support the CDP protocol**.

## Installation

```bash
npm install hermione-mocks --save-dev
```

## Usage

* **enabled** (optional) `Boolean` – enable/disable the plugin. By default plugin is disabled;
* **patterns** (optional) `{url: string, resources: string[] | "*"}[]`:
  - `url` (`string`) - A url pattern of mocking host. Example - "https://nodejs.org/*"
  - `resources` (`"*"` | `string[]`) - An array of resource types to be mocked. Supported resource types: `"Document", "Stylesheet", "Image", "Media", "Script", "XHR", "Fetch"`. You can also use "*" instead of array, it will work the same way as array of all mentioned resource types
* **browsers** (optional) `string[]` - array of `browserId` (from hermione config) to intercept requests for. Each of them should be using chrome-devtools protocol. Default - `[]`
* **mode** (optional) `"play" | "save" | "create"` - plugin's mode. Default - `"save"`. Available modes:
   - `"play"`: Reads dumps from fs (dumps should exist) 
   - `"save"`: Writes dumps to fs. **Overwrites** existing dumps
   - `"create"`: Writes dumps to fs. **Doesn't overwrite** existing dumps
* **dumpsDir** (optional) `string | (test: Hermione.Test) => string` -  dumps' directory. Default - `"hermione-dumps"`. Available types:
   - `string`: (ex: `"hermione-dumps"`). All your dumps will be located in `hermione-dumps` in the root of the project.
   - `(test: Hermione.Test) => string`: (ex: `path.join(path.dirname(test.file), "hermione-dumps")`. `hermione-dumps` directories will be located next to each hermione test). Saves tests' dumps to directories by path, returned by the function
* **dumpsKey** (optional) `(requestUrl: string) => string` - function to create dumps key from request url. Сan be used to remove query parameters that unique every time. If you dont remove unique query params, you will encounter an error `Cache is empty: key=...` on `play` mode.
* **gzipDumps** (optional) `Boolean` - enable/disable dump compressing. By default dumps are written and read in compressed form

Also there is ability to override plugin parameters by CLI options or environment variables (see [configparser](https://github.com/gemini-testing/configparser)).

Use `hermione_mocks_` prefix for the environment variables and `--mocks-` for the cli options.

* Add `hermione-mocks` plugin to your `hermione` config file:
```js
// .hermione.conf.js
module.exports = {
    plugins: {
        'hermione-mocks': {
            enabled: true,
            patterns: [
                {
                    url: "https://www.npmjs.com/*",
                    resources: ["Document", "Stylesheet", "Image", "Media", "Script", "XHR", "Fetch"]
                },
                {
                    url: "https://www.github.com/*",
                    resources: "*"
                }
            ]
            browsers: ["chrome"],
            mode: "save",
            dumpsDir: "hermione-dumps",
            dumpsKey: (requestUrl) => {
                const urlObj = new URL(requestUrl);

                urlObj.searchParams.delete('uniqRequestId');

                return urlObj.toString();
            },
            gzipDumps: true
        },

        // other hermione plugins...
    },

    // other hermione settings...
}
```
