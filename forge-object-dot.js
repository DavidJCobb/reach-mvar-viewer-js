class ForgeObjectDot extends HTMLElement {
   #ready = false;
   
   #object_name = null;
   #raw_object_type   = null;
   #raw_object_subcat = null;
   
   #is_synchronizing_to_attributes = false;
   
   constructor() {
      super();
      this.channel           = null; // "A" through "Z"
      this.forge_label       = null;
      this.gametype_specific = false;
      this.object_color      = null; // 0-indexed: red, blue, green, orange, purple, yellow, brown, pink
      this.shape             = null; // object with `type` field and size fields
      this.spare_clips       = null;
      this.spawn_sequence    = null;
      this.team              = null; // 0-indexed: red, blue, green, orange, purple, yellow, brown, pink, neutral
   }
   
   static observedAttributes = ["object-name"];
   attributeChangedCallback(name, oldValue, newValue) {
      if (this.#is_synchronizing_to_attributes)
         return;
      switch (name) {
         case "object-name":
            this.#object_name = newValue;
            break;
      }
   }
   connectedCallback() {
      if (!this.#ready) {
         this.#is_synchronizing_to_attributes = true;
         this.#update_title();
         this.#is_synchronizing_to_attributes = false;
      }
      this.#ready = true;
   }
   
   get object_name() { return this.#object_name; }
   set object_name(v) {
      if (this.#object_name == v)
         return;
      this.#object_name = v;
      if (this.#ready) {
         this.#is_synchronizing_to_attributes = true;
         this.#update_title();
         this.#is_synchronizing_to_attributes = false;
      }
   }
   
   get raw_object_type() { return this.#raw_object_type; }
   set raw_object_type(v) {
      if (this.#raw_object_type == v)
         return;
      this.#raw_object_type = v;
      if (this.#ready) {
         this.#is_synchronizing_to_attributes = true;
         this.#update_title();
         this.#is_synchronizing_to_attributes = false;
      }
   }
   
   get raw_object_subcat() { return this.#raw_object_subcat; }
   set raw_object_subcat(v) {
      if (this.#raw_object_subcat == v)
         return;
      this.#raw_object_subcat = v;
      if (this.#ready) {
         this.#is_synchronizing_to_attributes = true;
         this.#update_title();
         this.#is_synchronizing_to_attributes = false;
      }
   }
   
   #update_title() {
      let title_str = this.#object_name || "<unknown>";
      if (this.#raw_object_type !== null && this.#raw_object_subcat !== null) {
         title_str = `${title_str} (palette subfolder ${this.#raw_object_subcat} item ${this.#raw_object_type})`;
      }
      this.setAttribute("title", title_str);
   }
   
   update_shape_node() {
      this.querySelectorAll("div.shape").forEach(node => node.remove());
      if (this.shape && this.shape.type) {
         switch (this.shape.type) {
            case "box":
               //
               // TODO: show Box shapes once we understand the rotation data
               //
               break;
            case "cylinder":
               //
               // TODO: we currently assume cylinders are unrotated; this isn't 
               //       great. once we know how to handle rotations, fix this
               //
            case "sphere":
               {
                  let node = document.createElement("div");
                  node.classList.add("shape");
                  node.classList.add("circle");
                  node.style.setProperty("--radius", this.shape.radius);
                  this.append(node);
               }
               break;
         }
      }
   }
};
customElements.define("forge-object-dot", ForgeObjectDot);