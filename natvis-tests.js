
class NatvisTest {
   constructor() {
      this.value = 5;
      this.nested = {
         value: 4
      };
      this.parent = null;
   }
};

if (!window.devtoolsFormatters) {
   window.devtoolsFormatters = [];
}
{
   // Theming constants pulled from Firefox source:
   //  https://searchfox.org/mozilla-central/source/devtools/client/shared/components/object-inspector/components/ObjectInspector.css
   const DELIMITER_COLOR     = "var(--theme-comment)";
   const PROPERTY_NAME_COLOR = "var(--theme-highlight-blue)";
   
   const DELIMITER_ATTRIBUTES = {
      style: `color:${DELIMITER_COLOR}`
   };
   const NUMBER_ATTRIBUTES = {
      style: "color:var(--number-color)"
   };
   const STRING_ATTRIBUTES = {
      style: "color:var(--string-color)"
   };
   const TYPENAME_ATTRIBUTES = {
      style: `color:var(--object-color)`
   };
   const PROPERTY_NAME_ATTRIBUTES = {
      style: `color:${PROPERTY_NAME_COLOR}`
   };
   
   window.devtoolsFormatters.push({
      header: function(data, config) {
         if (!(data instanceof NatvisTest)) {
            if (!config || !config.is_natvis)
               return null;
            if (config.key) {
               return ["span", {},
                  ["span", PROPERTY_NAME_ATTRIBUTES, config.key],
                  ["span", DELIMITER_ATTRIBUTES, ": "],
                  ["span", TYPENAME_ATTRIBUTES, "Object {}"],
               ];
            }
         }
         return ["div", {}, `Natvis{ .value = ${data.value} }`];
      },
      hasBody: function(data, config) {
         if (!(data instanceof NatvisTest)) {
            if (!config)
               return false;
            if (!config.is_natvis)
               return false;
         }
         return true;
      },
      body: function(data, config) {
         if (!(data instanceof NatvisTest)) {
            if (!config || !config.is_natvis)
               return null;
         }
         let nesting = 1;
         if (config)
            nesting = config.nesting + 1;
         
         let attributes = {
            style: `margin-left: ${nesting * 20}px;`,
         };
         
         let out = ["div", {}];
         
         Object.keys(data).forEach(function(key) {
            let value = data[key];
            if (value !== null && typeof value == "object") {
               let config = {
                  key:     key,
                  nesting: 0,
                  is_natvis: true,
               };
               let wrap = ["div", attributes];
               let item = ["object", { object: data[key], config: config }];
               wrap.push(item);
               out.push(wrap);
            } else {
               let wrap = ["div", attributes];
               wrap.push(["span", PROPERTY_NAME_ATTRIBUTES, key]);
               wrap.push(["span", DELIMITER_ATTRIBUTES, ": "]);
               {
                  let attributes = {};
                  if (+value === value) {
                     attributes = NUMBER_ATTRIBUTES;
                  } else if (value+"" === value) {
                     attributes = STRING_ATTRIBUTES;
                  }
                  wrap.push(["span", attributes, value]);
               }
               out.push(wrap);
            }
         });
         return out;
      }
   });
}

{
   let root = new NatvisTest();
   root.child = new NatvisTest();
   console.log(root);
   
   let mimic = structuredClone(root);
   console.log(mimic);
}