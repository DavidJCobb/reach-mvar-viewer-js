
//
// A wrapper for the `devtoolsFormatters` functionality shared by Firefox and Chrome, 
// with helpers to work around the following problems:
//
//  - The design of the `devtoolsFormatters` API is such that if you want to display 
//    an object 90% normally but for some minor differences, tough luck. Once you 
//    use this API, you are responsible for absolutely everything about how an object 
//    is listed.
//
//    The DevtoolsFormatter helper class replicates the formatting used in Firefox to 
//    let you retain the default syntax highlighting and so on.
//
//  - It's not just visuals that you end up being responsible for, but structure as 
//    well: even things like indentation become your responsibility, because this API 
//    is, frankly, a trash fire. You can do almost anything, but you're also forced to 
//    do everything.
//
//    The DevtoolsFormatter helper class basically narrows the functionality down: you 
//    can choose what objects it applies to (by specifying a criterion function) and 
//    you can exclude specific keys from the readout.
//
class DevtoolsFormatter {
   #registered_formatter;
   
   //  https://searchfox.org/mozilla-central/source/devtools/client/shared/components/object-inspector/components/ObjectInspector.css
   // https://searchfox.org/mozilla-central/source/devtools/client/shared/components/reps/reps.css
   // https://searchfox.org/mozilla-central/source/devtools/client/shared/components/Tree.css
   static #ATTRIBUTES = {
      DEEMPHASIZE:   { style: "color:var(--theme-comment)" },
      DELIMITER:     { style: "color:var(--theme-comment)" },
      ELLIPSIS:      { style: "color:var(--comment-node-color)" },
      PROPERTY_NAME: { style: "color:var(--theme-highlight-blue)" },
      TYPENAME:      { style: "color:var(--object-color)" },
      
      NUMBER:      { style: "color:var(--number-color)" },
      OBJECT:      { style: "color:var(--object-color)" },
      STRING:      { style: "color:var(--string-color)" },
   };
   
   constructor() {
      this.criterion    = null;
      this.exclude_keys = null; // keys to exclude from the mini-view and from expanded items
      
      this.sort_expanded_items = true;
   }
   register() {
      if (this.#registered_formatter)
         return;
      
      this.#registered_formatter = {
         header:  this.#header.bind(this),
         hasBody: this.#hasBody.bind(this),
         body:    this.#body.bind(this),
      };
      
      if (!window.devtoolsFormatters) {
         window.devtoolsFormatters = [];
      }
      window.devtoolsFormatters.push(this.#registered_formatter);
   }
   unregister() {
      if (!this.#registered_formatter)
         return;
      let kill = this.#registered_formatter;
      let list = window.devtoolsFormatters;
      let i    = list.indexOf(kill);
      if (i >= 0)
         list.splice(i, 1);
      this.#registered_formatter = null;
   }
   
   #matchCriterion(data) {
      if (!this.criterion)
         return false;
      return (this.criterion)(data);
   }
   #matchExcludeKeys(obj, key, value) {
      if (!this.exclude_keys)
         return false;
      if (this.exclude_keys instanceof Array) {
         return this.exclude_keys.includes(key);
      }
      if (this.exclude_keys instanceof Function) {
         return (this.exclude_keys)(obj, key, value);
      }
      return false;
   }
   
   #makeValueFormat(value) {
      let is_object = (value !== null && typeof value == "object");
      let items = [];
      if (is_object) {
         if (Array.isArray(value)) {
            items = items.concat(this.#formatArrayDisplayString(value, true));
         } else {
            items = items.concat(this.#formatObjectDisplayString(value, true));
         }
      } else {
         const ATTRS = this.constructor.#ATTRIBUTES;
         
         let attr = null;
         let draw = value;
         if (+value === value) {
            attr = ATTRS.NUMBER;
         } else if (value + "" === value) {
            attr = ATTRS.STRING;
            draw = JSON.stringify(value); // to force delimiters
         } else {
            attr = {};
         }
         items.push(["span", attr, draw]);
      }
      return items;
   }
   #makeKeyValueFormat(key, value) {
      const ATTRS = this.constructor.#ATTRIBUTES;
      
      let items = [];
      items.push(["span", ATTRS.PROPERTY_NAME, key]);
      items.push(["span", ATTRS.DELIMITER, ": "]);
      items = items.concat(this.#makeValueFormat(value));
      return items;
   }
   
   #formatClassname(name) {
      const ATTRS = this.constructor.#ATTRIBUTES;
      
      return ["span", ATTRS.OBJECT, name];
   }
   #formatArrayDisplayString(array, inside_other_display_string) {
      const MAX_ITEMS_TO_SHOW = 3;
      const ATTRS = this.constructor.#ATTRIBUTES;
      
      let size      = array.length;
      let show_size = size >= MAX_ITEMS_TO_SHOW;
      
      let items = [];
      if (!inside_other_display_string) {
         let class_name = array.constructor?.name || "Array";
         items.push(["span", ATTRS.TYPENAME, `${class_name}`]);
      }
      if (inside_other_display_string || show_size) {
         items.push(["span", ATTRS.DEEMPHASIZE, `(${size})`]);
      }
      if (inside_other_display_string) {
         items.push(["span", ATTRS.OBJECT, " ["]);
         items.push(["span", ATTRS.ELLIPSIS, "…"]);
         items.push(["span", ATTRS.OBJECT, "]"]);
      } else {
         items.push(["span", ATTRS.OBJECT, " [ "]);
         let end = Math.min(MAX_ITEMS_TO_SHOW, size);
         for(let i = 0; i < end; ++i) {
            let value = array[i];
            items = items.concat(this.#makeValueFormat(value));
            if (i + 1 < size) {
               items.push(["span", {}, ", "]);
               if (i + 1 >= end) {
                  items.push(["span", ATTRS.ELLIPSIS, "…"]);
               }
            }
         }
         items.push(["span", ATTRS.OBJECT, " ]"]);
      }
      return items;
   }
   #formatObjectDisplayString(data, inside_other_display_string, matches_criterion) {
      const MAX_KEYS_TO_SHOW = 10; // max if all single-character names and single-digit values
      const ATTRS = this.constructor.#ATTRIBUTES;
      
      let out = [];
      {
         let class_name = "Object";
         if (data.constructor && data instanceof data.constructor) {
            class_name = data.constructor.name || class_name;
         }
         if (!inside_other_display_string) {
            out.push(this.#formatClassname(class_name));
         }
      }
      if (inside_other_display_string) {
         out.push(["span", ATTRS.OBJECT, "{"]);
         out.push(["span", ATTRS.ELLIPSIS, "…"]);
         out.push(["span", ATTRS.OBJECT, "}"]);
      } else {
         out.push(["span", ATTRS.OBJECT, " { "]);
         let keys = Object.keys(data);
         let seen = 0;
         let size = keys.length;
         for(let i = 0; i < size; ++i) {
            let key   = keys[i];
            let value = data[key];
            if (matches_criterion) {
               if (this.#matchExcludeKeys(data, key, value)) {
                  continue;
               }
            }
            
            if (seen) {
               out.push(this.#formatClassname(", "));
               if (seen == MAX_KEYS_TO_SHOW) {
                  out.push(["span", ATTRS.ELLIPSIS, "…"]);
                  break;
               }
            }
            out = out.concat(this.#makeKeyValueFormat(key, value));
            ++seen;
         }
         out.push(["span", ATTRS.OBJECT, " }"]);
      }
      return out;
   }
   
   // roughly equivalent to Natvis DisplayString
   #header(data, config) {
      const ATTRS = this.constructor.#ATTRIBUTES;
      
      let class_name = "Object";
      if (data.constructor && data instanceof data.constructor) {
         class_name = data.constructor.name || class_name;
      }
      
      if (!this.#matchCriterion(data)) {
         if (!config || config.natvis != this)
            return null;
         if (config.key) {
            let out = ["span", {}];
            if (Array.isArray(data)) {
               out = out.concat([
                  ["span", ATTRS.PROPERTY_NAME, config.key],
                  ["span", ATTRS.DELIMITER, ": "],
               ]);
               out = out.concat(this.#formatArrayDisplayString(data));
               return out;
            }
            out = out.concat([
               ["span", ATTRS.PROPERTY_NAME, config.key],
               ["span", ATTRS.DELIMITER, ": "],
            ]);
            out = out.concat(this.#formatObjectDisplayString(data, false, false));
            return out;
         }
      }
      let out = ["div", {}];
      if (config && config.natvis == this && config.key) {
         out.push(["span", ATTRS.PROPERTY_NAME, config.key]);
         out.push(["span", ATTRS.DELIMITER, ": "]);
      }
      out = out.concat(this.#formatObjectDisplayString(data, false, true));
      return out;
   }
   #hasBody(data, config) {
      if (!this.#matchCriterion(data)) {
         if (!config || config.natvis != this)
            return false;
      }
      return true;
   }
   #body(data, config) {
      if (!this.#matchCriterion(data)) {
         if (!config || config.natvis != this)
            return null;
      }
      let nesting = 1;
      if (config)
         nesting = config.nesting + 1;
      
      let keys = Object.keys(data);
      let any_expandable = false;
      let any_simple     = false;
      for(let key of keys) {
         let value = data[key];
         if (value !== null && typeof value == "object") {
            any_expandable = true;
         } else {
            any_simple = true;
         }
         if (any_simple && any_expandable)
            break;
      }
      
      let attr_block  = { style: `margin-left: ${nesting * 12}px;` };
      let attr_single = { style: `margin-left: ${nesting * 12}px;` };
      if (any_simple && any_expandable)
         attr_single.style = `margin-left: ${nesting * 12 + 14}px;`;
      
      let out = ["div", {}];
      
      if (this.sort_expanded_items) {
         keys.sort(function(a, b) {
            if (!isNaN(+a) && !isNaN(+b))
               return +a - +b;
            return a.localeCompare(b);
         });
      }
      keys.forEach((function(key) {
         let value = data[key];
         if (this.#matchExcludeKeys(data, key, value)) {
            return;
         }
         
         let wrap = ["div", {}];
         if (value !== null && typeof value == "object") {
            wrap[1] = attr_block;
            let config = {
               key:     key,
               nesting: 0,
               natvis:  this,
            };
            let item = ["object", { object: data[key], config: config }];
            wrap.push(item);
         } else {
            wrap[1] = attr_single;
            wrap = wrap.concat(this.#makeKeyValueFormat(key, value));
         }
         out.push(wrap);
      }).bind(this));
      return out;
   }
}


/*// Testing:
class NatvisTest {
   constructor() {
      this.value = 5;
      this.nested = {
         value: 4
      };
      this.array = [3, 4, 5, 6];
      this.asdf = [1];
      this.parent = null;
   }
};
{
   let fmt = new DevtoolsFormatter();
   fmt.criterion = function(data) {
      return data instanceof NatvisTest;
   };
   fmt.exclude_keys = function(obj, key, value) {
      return key == "parent";
   };
   fmt.register();
}
{
   let root = new NatvisTest();
   root.child = new NatvisTest();
   console.log(root);
   
   let mimic = structuredClone(root);
   console.log(mimic);
   
   console.log({b: 5, a: 4});
}
//*/
