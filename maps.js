
// requires: parse-foundation-exported-xml.js

let REACH_MAPS;

class ReachMapDefinition {
   #forge_palettes        = null;
   #named_location_areas = null;
   #safe_kill_areas      = null;
   
   #metadata_promise   = null;
   #metadata_load_done = false;
   
   constructor(init) {
      this.is_campaign  = init.is_campaign || false;
      this.is_firefight = init.is_firefight || false;
      
      this.map_id = init.map_id || null; // legacy (Reach-local) map ID
      this.mcc_id = init.mcc_id || null; // Master Chief Collection map ID (global across all games)
      
      this.name          = init.name;          // friendly English-language name
      this.internal_name = init.internal_name; // internal name (e.g. m05)
      
      if (this.map_id && this.is_forgeable) {
         let promises = [
            load_foundation_exported_xml(`./map-data/${this.map_id}/forge-palette.xml`),
            load_foundation_exported_xml(`./map-data/${this.map_id}/named-locations.xml`),
            load_foundation_exported_xml(`./map-data/${this.map_id}/safe-kill-areas.xml`),
         ];
         promises[0].then(this.#load_forge_palettes.bind(this), function() {});
         promises[1].then(this.#load_named_locations.bind(this), function() {});
         this.#metadata_promise = Promise.allSettled(promises);
         this.#metadata_promise.then(function() {
            this.#metadata_load_done = true;
         }.bind(this));
      } else {
         this.#metadata_promise   = Promise.resolve();
         this.#metadata_load_done = true;
      }
   }
   
   get is_forgeable() {
      return !this.is_campaign && !this.is_firefight;
   }
   
   #load_forge_palettes(data) {
      data = data["map variant palettes"];
      if (!data)
         return;
      
      let palettes = this.#forge_palettes = [];
      for(let item of data.elements) {
         let src_folders = item?.entries?.elements;
         if (!src_folders)
            continue;
         let palette = {
            name:                item.name,
            min_thorage_version: item["minimum thorage version"],
            folders:             []
         };
         palettes.push(palette);
         
         for(let src_folder of src_folders) {
            let folder = {
               name:                src_folder.name,
               budget_cost:         src_folder["price per instance"],
               max_count:           src_folder["maximum allowed"],
               min_thorage_version: src_folder["minimum thorage version"],
               items:               []
            };
            palette.folders.push(folder);
            
            let src_items = src_folder.variants?.elements;
            if (!src_items)
               continue;
            for(let src_item of src_items) {
               let item = {
                  object: src_item.object,
               };
               folder.items.push(item);
            }
            folder.is_submenu = folder.items.length > 1;
         }
      }
   }
   #load_named_locations(data) {
      data = data["named location volumes"];
      if (!data)
         return;
      
      let locations = this.#named_location_areas = [];
      for(let item of data.elements) {
         let points = item?.points?.elements;
         if (!points)
            continue;
         let location = {
            height: item.height,
            sink:   item.sink,
            name:   item["location name"] || item.name,
            points: [],
         };
         locations.push(location);
         for(let point of points) {
            let pos = new Vec3(point.position);
            pos[1] = -pos[1]; // negate Y
            location.points.push(pos);
         }
      }
      locations.sort(function(a, b) {
         if (a.height == null) {
            if (b.height == null)
               return 0;
            return -1;
         }
         if (b.height == null)
            return 1;
         return a.height < b.height;
      });
   }
   
   static make_map_variant_unk02B8(map_id) {
      let mcc_id = -1;
      for(let map of REACH_MAPS) {
         if (map.map_id == map_id) {
            mcc_id = map.mcc_id;
            break;
         }
      }
      
      let out = {
         /*uint32_t*/ map_mcc_id: 0x00000000, // 00
         /*uint16_t*/ unk04:      0x0000,     // 04
         /*uint16_t*/ unk06:      0x0000,     // 06
         /*uint64_t*/ unk08:      0x0000000000000000, // 08
      };
      if (mcc_id != -1) {
         out.map_mcc_id = mcc_id;
         out.unk04      = 0x0000;
         out.unk06      = 0x8888;
         out.unk08      = 0x0000000000000000;
      }
      return out;
   }
   
   resolve_palette_information(folder_index, item_index) {
      let out = {
         palette: null,
         folder:  null,
         item:    null,
      };
      let fi  = 0;
      for(let palette of this.forge_palettes) {
         for(let folder of palette.folders) {
            if (fi == folder_index) {
               out.palette = palette;
               out.folder  = folder;
               //
               let item = folder.items[item_index];
               if (item) {
                  out.item = item;
               }
               return out;
            }
            ++fi;
         }
      }
      return null;
   }
   get_object_name(folder_index, item_index) {
      let folder = this.get_object_palette_folder(folder_index);
      if (!folder)
         return null;
      let item = folder.items[item_index];
      if (item)
         return item.object;
      return null;
   }
   get_object_palette_folder(folder_index) {
      let folder_i = 0;
      for(let palette of this.forge_palettes) {
         for(let folder of palette.folders) {
            if (folder_i == folder_index)
               return folder;
            ++folder_i;
         }
      }
      return null;
   }
   
   get metadata_ready() { return this.#metadata_load_done; }
   
   get forge_palettes()       { return this.#forge_palettes; }
   get named_location_areas() { return this.#named_location_areas; }
   get safe_kill_areas()      { return this.#safe_kill_areas; }
}

REACH_MAPS = Object.freeze([
   new ReachMapDefinition({
      is_campaign: true,
      map_id: 5005,
      mcc_id: 0xB2,
      name:   "NOBLE Actual",
      internal_name: "m05",
   }),
   new ReachMapDefinition({
      is_campaign: true,
      map_id: 5010,
      mcc_id: 0xB3,
      name:   "Winter Contingency",
      internal_name: "m10",
   }),
   new ReachMapDefinition({
      is_campaign: true,
      map_id: 5020,
      mcc_id: 0xB4,
      name:   "ONI: Sword Base",
      internal_name: "m20",
   }),
   new ReachMapDefinition({
      is_campaign: true,
      map_id: 5030,
      mcc_id: 0xB5,
      name:   "Nightfall",
      internal_name: "m30",
   }),
   new ReachMapDefinition({
      is_campaign: true,
      map_id: 5035,
      mcc_id: 0xB6,
      name:   "Tip of the Spear",
      internal_name: "m35",
   }),
   new ReachMapDefinition({
      is_campaign: true,
      map_id: 5045,
      mcc_id: 0xB7,
      name:   "Long Night of Solace",
      internal_name: "m45",
   }),
   new ReachMapDefinition({
      is_campaign: true,
      map_id: 5050,
      mcc_id: 0xB8,
      internal_name: "m50",
   }),
   new ReachMapDefinition({
      is_campaign: true,
      map_id: 5052,
      mcc_id: 0xB9,
      internal_name: "m52",
   }),
   new ReachMapDefinition({
      is_campaign: true,
      map_id: 5060,
      mcc_id: 0xBA,
      internal_name: "m60",
   }),
   new ReachMapDefinition({
      is_campaign: true,
      map_id: 5070,
      mcc_id: 0xBB,
      internal_name: "m70",
   }),
   new ReachMapDefinition({
      is_campaign: true,
      map_id: 5075,
      mcc_id: 0xBC,
      internal_name: "m70_a",
   }),
   new ReachMapDefinition({
      is_campaign: true,
      map_id: 5080,
      mcc_id: 0xBD,
      name:   "Lone Wolf",
      internal_name: "m70_bonus",
   }),
   new ReachMapDefinition({
      map_id: 1035,
      mcc_id: 0xBE,
      name:   "Boardwalk",
      internal_name: "50_panopticon",
   }),
   new ReachMapDefinition({
      map_id: 1080,
      mcc_id: 0xBF,
      name:   "Boneyard",
      internal_name: "70_boneyard",
   }),
   new ReachMapDefinition({
      map_id: 1020,
      mcc_id: 0xC0,
      name:   "Countdown",
      internal_name: "45_launch_station",
   }),
   new ReachMapDefinition({
      map_id: 1055,
      mcc_id: 0xC1,
      name:   "Powerhouse",
      internal_name: "30_settlement",
   }),
   new ReachMapDefinition({
      map_id: 1150,
      mcc_id: 0xC2,
      name:   "Reflection",
      internal_name: "52_ivory_tower",
   }),
   new ReachMapDefinition({
      map_id: 1200,
      mcc_id: 0xC3,
      name:   "Spire",
      internal_name: "35_island",
   }),
   new ReachMapDefinition({
      map_id: 1000,
      mcc_id: 0xC4,
      name:   "Sword Base",
      internal_name: "20_sword_slayer",
   }),
   new ReachMapDefinition({
      map_id: 1040,
      mcc_id: 0xC5,
      name:   "Zealot",
      internal_name: "45_aftship",
   }),
   new ReachMapDefinition({
      map_id: 2001,
      mcc_id: 0xC6,
      name:   "Anchor 9",
      internal_name: "dlc_slayer",
   }),
   new ReachMapDefinition({
      mcc_id: 0xC7,
      map_id: 2002,
      name:   "Breakpoint",
      internal_name: "dlc_invasion",
   }),
   new ReachMapDefinition({
      map_id: 2004,
      mcc_id: 0xC8,
      name:   "Tempest",
      internal_name: "dlc_medium",
   }),
   new ReachMapDefinition({
      map_id: 1500,
      mcc_id: 0xC9,
      nam:    "Condemned",
      internal_name: "condemned",
   }),
   new ReachMapDefinition({
      map_id: 1510,
      mcc_id: 0xCA,
      name:   "Highlands",
      internal_name: "trainingpreserve",
   }),
   new ReachMapDefinition({
      map_id: 10020,
      mcc_id: 0xCB,
      name:   "Battle Canyon",
      internal_name: "cex_beaver_creek",
   }),
   new ReachMapDefinition({
      map_id: 10010,
      mcc_id: 0xCC,
      name:   "Penance",
      internal_name: "cex_damnation",
   }),
   new ReachMapDefinition({
      map_id: 10030,
      mcc_id: 0xCD,
      name:   "Ridgeline",
      internal_name: "cex_timerland",
   }),
   new ReachMapDefinition({
      map_id: 10070,
      mcc_id: 0xCE,
      name:   "Solitary",
      internal_name: "cex_prisoner",
   }),
   new ReachMapDefinition({
      map_id: 10060,
      mcc_id: 0xCF,
      name:   "High Noon",
      internal_name: "cex_hangemhigh",
   }),
   new ReachMapDefinition({
      map_id: 10050,
      mcc_id: 0xD0,
      name:   "Breakneck",
      internal_name: "cex_headlong",
   }),
   new ReachMapDefinition({
      map_id: 3006,
      mcc_id: 0xD1,
      name:   "Forge World",
      internal_name: "forge_halo",
   }),
   new ReachMapDefinition({
      is_firefight: true,
      map_id: 7060,
      mcc_id: 0xD2,
      name:   "Beachhead",
      internal_name: "ff50_park",
   }),
   new ReachMapDefinition({
      is_firefight: true,
      map_id: 7110,
      mcc_id: 0xD3,
      name:   "Corvette",
      internal_name: "ff45_corvette",
   }),
   new ReachMapDefinition({
      is_firefight: true,
      map_id: 7020,
      mcc_id: 0xD4,
      name:   "Courtyard",
      internal_name: "ff20_courtyard",
   }),
   new ReachMapDefinition({
      is_firefight: true,
      map_id: 7130,
      mcc_id: 0xD5,
      name:   "Glacier",
      internal_name: "ff60_icecave",
   }),
   new ReachMapDefinition({
      is_firefight: true,
      map_id: 7080,
      mcc_id: 0xD6,
      name:   "Holdout",
      internal_name: "ff70_holdout",
   }),
   new ReachMapDefinition({
      is_firefight: true,
      map_id: 7030,
      mcc_id: 0xD7,
      nam:    "Outpost",
      internal_name: "ff60_ruins",
   }),
   new ReachMapDefinition({
      is_firefight: true,
      map_id: 7000,
      mcc_id: 0xD8,
      name:   "Overlook",
      internal_name: "ff10_prototype",
   }),
   new ReachMapDefinition({
      is_firefight: true,
      map_id: 7040,
      mcc_id: 0xD9,
      name:   "Waterfront",
      internal_name: "ff30_waterfront",
   }),
   new ReachMapDefinition({
      is_firefight: true,
      map_id: 7500,
      mcc_id: 0xDA,
      name:   "Unearthed",
      internal_name: "ff_unearthed",
   }),
   new ReachMapDefinition({
      is_firefight: true,
      map_id: 10080,
      mcc_id: 0xDB,
      name:   "Installation 04",
      internal_name: "cex_ff_halo",
   }),
]);