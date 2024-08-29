
{
   let formatter = new DevtoolsFormatter();
   formatter.criterion = function(data) {
      return data.__is_exported_blam;
   };
   formatter.exclude_keys = [ "__is_exported_blam", "__parent" ];
   formatter.register();
}


function parse_foundation_exported_xml(root) {
   let data   = {};
   data.__is_exported_blam = true;
   let target = data;
   for(let node of root.children) {
      if (node.nodeName == "field") {
         target = target.__parent || data;
         
         let name  = node.getAttribute("name");
         let value = void 0;
         let type  = node.getAttribute("type");
         switch (type) {
            case "char integer":
            case "short integer":
            case "long integer":
            case "real":
               value = +node.getAttribute("value");
               break;
            case "string id":
            case "tag reference":
            default:
               value = node.getAttribute("value");
               break;
            case "real point 3d":
               value = node.getAttribute("value").split(",");
               value = value.map(e => +e);
               break;
            case "real euler angles 2d":
               value = node.getAttribute("value").split(",");
               value = value.map(e => +e);
               break;
            case "block":
               value = { __parent: target, __is_exported_blam: true };
               break;
            case "pad":
               //
               // Skip.
               //
               continue;
         }
         target[name] = value;
         if (type == "block") {
            value.name = name;
            target = value;
         }
         continue;
      }
      if (node.nodeName == "element") {
         if (!target.elements)
            target.elements = [];
         
         let name  = node.getAttribute("name");
         let value = parse_foundation_exported_xml(node);
         if (!value.name)
            value.name = name;
         
         let i = node.getAttribute("index");
         if (i !== null)
            target.elements[+i] = value;
         else if (name)
            target[name] = value;
         else
            target.elements.push(value);
      }
   }
   return data;
}

async function load_foundation_exported_xml(filename) {
   let response = await fetch(filename);
   let text     = await response.text();
   let parser   = new DOMParser();
   let doc      = parser.parseFromString(text, "application/xml");
   if (doc && !doc.querySelector("parsererror"))
      return parse_foundation_exported_xml(doc.documentElement);
   return null;
}