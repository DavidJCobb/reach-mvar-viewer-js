
// requires ForgeRotation
// requires Vec3

function _sub4DC8E0(bitcount, mapBounds, out) {
   //
   // Determines the proper bitcounts to use for object position coordinates, given the 
   // map bounds and the baseline bitcount specified.
   //
   function highest_bit_set(value) {
      let r = 0;
      while (value >>= 1)
         ++r;
      return r;
   }
   
   let rangesByAxis = [
      mapBounds.x.max - mapBounds.x.min,
      mapBounds.y.max - mapBounds.y.min,
      mapBounds.z.max - mapBounds.z.min
   ];
   out[0] = bitcount;
   out[1] = bitcount;
   out[2] = bitcount;
   let min_step; // register XMM6 // minimum possible representable distance
   const MINIMUM_UNIT_16BIT = 0.00833333333; // hex 0x3C088889 == 0.00833333376795F
   if (bitcount > 0x10) {
      //
      // something to do with the "extra" bits; if bitcount == 0x10 then min_step is just the constant
      //
      min_step = MINIMUM_UNIT_16BIT;
      let ecx  = bitcount - 0x10; // (ecx = (dword)bitcount + 0xFFFFFFF0) i.e. (ecx = bitcount + -10)
      let xmm0 = 1 << ecx; // 1 << cl
      min_step /= xmm0;
      //
      // I think that min_step is something like our "effective precision," and 
      // if we have more bits, then we can use smaller steps with min_step being 
      // the step size...
      //
   } else {
      //
      // something to do with the "missing" bits; if bitcount == 0x10 then min_step is just the constant
      //
      min_step = 1 << (0x10 - bitcount);
      min_step *= MINIMUM_UNIT_16BIT;
      //
      // ...whereas if we have fewer than 16 bits, then we need to use a larger 
      // (i.e. less precise) step size.
      //
   }
   if (min_step >= 0.0001) { // hex 0x38D1B717 == 9.99999974738e-05
      min_step *= 2;
      for(let i = 0; i < 3; ++i) {
         let xmm0 = Math.ceil(rangesByAxis[i] / min_step);
         let edx  = Math.floor(xmm0); // truncate to integer
         edx = Math.min(0x800000, edx);
         let ecx = -1;
         if (edx) { // asm: TEST EDX, EDX; JE
            ecx = 31;
            if (edx >= 0) // asm: JS
               ecx = highest_bit_set(edx);
         }
         let r8 = 0;
         if (ecx != -1) {
            let eax = (1 << ecx) - 1;
            r8  = ecx + (((edx & eax) != 0) ? 1 : 0);
         }
         let eax = Math.min(26, r8);
         out[i] = eax;
      }
   } else {
      for(let i = 0; i < 3; ++i)
         out[i] = 26;
   }
}

class LoadedForgeObjectExtraData { // sizeof >= 0x1C
   loadShape(stream) {
      let sw = stream.readBits(2);
      this.shapeType = sw;
      let xmm3 = 0.0977517142892;
      let xmm0 = 0;
      let xmm4 = 0.0488758571446;
      let xmm2 = 200;
      let xmm1;
      switch (sw) {
         case 1: {
            let a = stream.readBits(0xB);
            if (!a) {
               this.shapeSizeRadius = 0;
            } else {
               if (a == 0x7FF) {
                  this.shapeSizeRadius = 200; // float
               } else {
                  --a;
                  a *= 0.0977517142892;
                  a += 0.0488758571446;
                  this.shapeSizeRadius = a;
               }
            }
         }; return;
         //
         case 3: {
            let eax = stream.readBits(sw + 8);
            if (!eax) {
               xmm1 = xmm0;
            } else if (eax == 0x7FF) {
               xmm1 = xmm2;
            } else {
               xmm1 = (eax - 1) * xmm3 + xmm4;
            }
            this.shapeSizeRadius = xmm1;
            eax = stream.readBits(0xB);
            if (eax == 0) {
               xmm1 = xmm0;
               this.shapeSizeLength = xmm1;
            } else if (eax == 0x7FF) {
               xmm1 = xmm2;
               this.shapeSizeLength = xmm1;
            } else {
               xmm1 = (eax - 1) * xmm3 + xmm4;
               this.shapeSizeLength = xmm1;
            }
         }; break;
         //
         case 2: {
            let eax = stream.readBits(0xB);
            if (!eax) {
               xmm1 = xmm0;
            } else if (eax == 0x7FF) {
               xmm1 = xmm2;
            } else {
               xmm1 = (eax - 1) * xmm3 + xmm4;
            }
            this.shapeSizeRadius = xmm1;
         }; break;
         //
         default:
            return;
      }
      let eax = stream.readBits(0xB);
      if (!eax) {
         xmm1 = xmm0;
      } else if (eax == 0x7FF) {
         xmm1 = xmm2;
      } else {
         xmm1 = (eax - 1) * xmm3 + xmm4;
      }
      this.shapeSizeTop = xmm1;
      eax = stream.readBits(0xB);
      if (!eax) {
         xmm1 = xmm0;
      } else if (eax == 0x7FF) {
         xmm1 = xmm2;
      } else {
         xmm1 = (eax - 1) * xmm3 + xmm4;
      }
      this.shapeSizeBottom = xmm1;
   }
   constructor(stream) {
      this.shapeSizeRadius = 0; // float (shape dimension 0? width or length; radius for cylinder)
      this.shapeSizeLength = 0; // float (shape dimension 1? width or length)
      this.shapeSizeTop    = 0; // float (shape dimension 2? top for cylinder)
      this.shapeSizeBottom = 0; // float (shape dimension 3? bottom for cylinder)
      this.shapeType = 0; // byte  (shape type: none, sphere, cylinder, box)
      this.spawnSequence = 0; // 11 // byte; UI clamps this to [-100, 100]
      this.respawnTime  = 0; // 12 // byte
      this.mpObjectBaseType = 0; // 13 // byte // crate tag, multiplayer object block, type
         // 0: ordinary
         // 1: weapon
         // 2: grenade
         // 3: projectile
         // 4: powerup
         // 5: equipment
         // 6: ammo pack
         // 7: light land vehicle
         // 8: heavy land vehicle
         // 9: flying vehicle
         // 10: turret
         // 11: device
         // 12: teleporter, two-way
         // 13: teleporter, sender
         // 14: teleporter, receiver
         // 15: player spawn location
         // 16: player respawn zone
         // 17: secondary objective
         // 18: primary objective
         // 19: named location area
         // 20: danger zone
         // 21: fireteam 1 respawn zone
         // 22: fireteam 2 respawn zone
         // 23: fireteam 3 respawn zone
         // 24: fireteam 4 respawn zone
         // 25: safe volume
         // 26: kill volume
         // 27: cinematic camera position
      this.forgeLabelIndex = -1; // 14 // word
      this.bitfield16 = 0; // byte // bitfield (physics, symmetry, flags, maybe some other stuff)
         //
         // Bits: PP G ? AA S ?
         //  - P: Physics
         //     - 00: Normal
         //     - 01: Fixed
         //     - 10: ?
         //     - 11: Phased
         //  - G: Gametype-Specific
         //  - A: Symmetry
         //     - 00: ?
         //     - 01: Symmetric
         //     - 10: Asymmetric
         //     - 11: Both
         //  - S: DO NOT Place At Start
         //
      this.team  = 0; // 17 // byte // team (0-indexed, 8 is Neutral)
      this.union18 = 0; // 18 // union
      this.rawTeleportFlags = 0; // 19 // teleporter flags
      this.color = -1; // 1A // byte // Object Color; -1 = Team Color
      this.team  = 8; // 17 // byte // team
      if (!stream)
         return;
      this.loadShape(stream); // read shape
      //
      let eax = stream.readBits(8);
      if (eax & 0x80000000) // test if signed
         eax |= 0xFFFFFF00;
      this.spawnSequence = eax & 0xFF;
      //
      this.respawnTime = stream.readBits(8);
      this.mpObjectBaseType = stream.readBits(5); // teleporter channel? 's got the right number of bits
      if (stream.readBits(1)) { // absence bit
         this.forgeLabelIndex = -1; // word
      } else {
         this.forgeLabelIndex = stream.readBits(8); // word
      }
      this.bitfield16 = stream.readBits(8); // byte
      this.team  = stream.readBits(4) - 1; // object color?
      if (!stream.readBits(1)) {
         this.color = stream.readBits(3); // byte
      } else {
         this.color = -1; // byte
      }
      //
      if (this.mpObjectBaseType == 1) { // weapon
         this.union18 = stream.readBits(8); // byte: spare clips
         return;
      } else if (this.mpObjectBaseType <= 11) {
         return;
      } else if (this.mpObjectBaseType <= 14) { // teleporter node
         this.union18          = stream.readBits(5); // byte: teleporter channel
         this.rawTeleportFlags = stream.readBits(5); // byt
      } else if (this.mpObjectBaseType == 19) { // named location area
         this.union18 = stream.readBits(8) - 1; // byte
      }
   }
   
   //
   // Bitfield-16:
   //
   get placedAtStart() {
      return !(this.bitfield16 & 2);
   }
   set placedAtStart(v) {
      if (v)
         this.bitfield16 &= ~2;
      else
         this.bitfield16 |= 2;
   }
   //
   get gametypeSpecific() {
      return (this.bitfield16 & 0b00100000) != 0;
   }
   set gametypeSpecific(v) {
      if (v)
         this.bitfield16 |= 0b00100000;
      else
         this.bitfield16 &= ~0b00100000;
   }
   //
   static #PHYSICS = [ "normal", "fixed", "?", "phased" ];
   get physics() {
      let p = this.bitfield16 >> 6;
      return this.constructor.#PHYSICS[p];
   }
   set physics(v) {
      let p = this.bitfield16 & 0b00111111;
      let i = this.constructor.#PHYSICS.indexOf(v);
      if (i < 0)
         throw new Error("invalid value");
      this.bitfield16 = p | (i << 6);
   }
   //
   static #SYMMETRY = [ "never?", "symmetric", "asymmetric", "both" ];
   get symmetry() {
      let p = (this.bitfield16 >> 2) & 0b11;
      return this.constructor.#SYMMETRY[p];
   }
   set symmetry(v) {
      let p = this.bitfield16 & 0b11110011;
      let i = this.constructor.#SYMMETRY.indexOf(v);
      if (i < 0)
         throw new Error("invalid value");
      this.bitfield16 = p | (i << 2);
   }
   
   //
   // Type-dependent properties:
   //
   get channel() {
      if (this.mpObjectBaseType >= 12 && this.mpObjectBaseType <= 14)
         return this.union18; // 5-bit
      return null;
   }
   get locationName() {
      if (this.mpObjectBaseType == 19)
         return this.union18; // 8-bit minus one; value -1 for none
      return null;
   }
   get spareClips() {
      if (this.mpObjectBaseType == 1)
         return this.union18; // 8-bit
      return null;
   }
   //
   get teleporterFlags() {
      switch (this.mpObjectBaseType) {
         case 12:
         case 13:
         case 14:
            break;
         default:
            return null;
      }
      return {
         allow_players:        !(this.rawTeleportFlags & 1),
         allow_land_vehicles:  (this.rawTeleportFlags & 2) != 0,
         allow_heavy_vehicles: (this.rawTeleportFlags & 4) != 0,
         allow_air_vehicles:   (this.rawTeleportFlags & 8) != 0,
         allow_projectiles:    (this.rawTeleportFlags & 16) != 0,
      };
   }
}

class LoadedForgeObject {
   loadPosition(stream, mapBounds) {
      const bitcount = 21;
      //
      let rbp60 = [0, 0, 0];
      let a = stream.readBits(1); // can't understand how this is used
      if (a) {
         if (mapBounds) {
            _sub4DC8E0(bitcount, mapBounds, rbp60);
         } else {
            //
            // TODO: initialize rbp60 to some static values set by sub$+4DC4F0, which is 
            // ultimately called by a virtual member function somewhere
            //
         }
      } else {
         if (mapBounds) {
            _sub4DC8E0(bitcount, mapBounds, rbp60);
         } else {
            if (!stream.readBits(1)) {
               let b = stream.readBits(2, false);
               if (b != -1) {
                  //
                  // TODO: call _sub4DC8E0 but with different args than usual
                  //
               }
            }
         }
      }
      this.position.x = stream.readBits(rbp60[0], false); // compressed float
      this.position.y = stream.readBits(rbp60[1], false); // compressed float
      this.position.z = stream.readBits(rbp60[2], false); // compressed float   
      //
      let range = mapBounds.x.max - mapBounds.x.min;
      let xmm3, xmm1;
      this.position.x = (0.5 + this.position.x) * (range / (1 << rbp60[0])) + mapBounds.x.min;
      //
      range = mapBounds.y.max - mapBounds.y.min;
      this.position.y = (0.5 + this.position.y) * (range / (1 << rbp60[1])) + mapBounds.y.min;
      //
      range = mapBounds.z.max - mapBounds.z.min;
      this.position.z = (0.5 + this.position.z) * (range / (1 << rbp60[2])) + mapBounds.z.min;
   }
   constructor(stream, mapBounds, owner) {
      this.loaded = false;
      this.owner  = owner || null;
      //
      this.unk00 = 0;
      //
      // objectTypeForgeFolder
      //    In the MAP file, look at the SCNR (scenario) tag's Sandbox Palette. This 
      //    structure defines categories (Sandbox Palette), subcategories (Entries), 
      //    and objects in subcategories (Entry Variants); when an object is nested 
      //    directly under a category, this works by having a subcategory with a name 
      //    and only a single contained object. Forge count and price limits are 
      //    defined per subcategory. Treat all this as a flat array of subcategories, 
      //    and this is the index of a subcategory.
      //
      this.objectTypeForgeFolder = 0xFFFF; // 02
      //
      this.unk04 = -1; // dword
      this.position = new Vec3(); // 08, 0C, 10
      this.rotation = new ForgeRotation();
         // local up:  14, 18, 1C
         // local fwd: 20, 24, 28
      this.unk2C = -1; // word
      this._raw_rotation = { // for debugging the loader
         absence_bit: null,
         axis:        null,
         angle:       null,
      };
      //
      // objectTypeForgeFolderItem
      //    Index of an object within a subcategory.
      //
      //    As an example, Coliseum Walls on Tempest have objectTypeForgeFolder 71 and 
      //    objectSubtype 8.
      //
      this.objectTypeForgeFolderItem = 0; // 2E
      //
      this.unk2F = 0; // padding?
      this.extraData = null; // 30 // struct; all remaining fields are its members
      /*//
      this.unk30 = 0; // int64?
      this.unk38 = 0; // int64?
      this.unk40 = 0;
      this.unk41 = 0; // padding?
      this.unk42 = 0; // padding?
      this.unk43 = 0;
      this.unk44 = 0xFFFF;
      this.unk46 = 0; // padding?
      this.unk48 = 0;
      this.unk4A = 0xFF;
      this.unk4B = 0;
      //*/
      if (!stream)
         return;
      //
      let presence = stream.readBits(1);
      if (!presence)
         return;
      this.loaded = true;
      this.unk00 = stream.readBits(2, false);
      if (!stream.readBits(1))
         this.objectTypeForgeFolder = stream.readBits(8, false);
      let absence = stream.readBits(1);
      if (!absence)
         this.objectTypeForgeFolderItem = stream.readBits(5, false); // value in the range of [0, 31]
      else
         this.objectTypeForgeFolderItem = 0xFF; // -1
      this.loadPosition(stream, mapBounds);
      {  // Rotation
         if (stream.readBits(1)) {
            this._raw_rotation.absence_bit = true;
            this.rotation.up_vector.x = 0;
            this.rotation.up_vector.y = 0;
            this.rotation.up_vector.z = 1;
         } else {
            this._raw_rotation.absence_bit = false;
            
            const bitcount = 20;
            
            let bits = stream.readBits(bitcount, false);
            this.rotation.decode_axis(bitcount, bits);
         }
         let a = stream.readBits(14, false);
         this._raw_rotation.angle = a;
         this.rotation.decode_angle(a);
      }
      this.unk2C = stream.readBits(10, false) - 1;
      this.extraData = new LoadedForgeObjectExtraData(stream);
   }
   get forgeLabel() {
      if (!this.owner)
         return void 0;
      if (!this.extraData)
         return null;
      let index = this.extraData.forgeLabelIndex;
      if (index < 0)
         return null;
      let entry = this.owner.forgeLabels.strings[index];
      if (!entry)
         return NaN;
      return entry.content;
   }
}

class MapVariant {
   constructor(stream) {
      stream.endianness = ENDIAN_LITTLE;
      this.signature = stream.readString(4);
      if (this.signature != "mvar")
         throw new Error(`MapVariant expected signature "mvar"; got "${this.signature}".`);
      let size = stream.readUInt32();
      if (size != 0x7028) {
         size = _byteswap_ulong(size);
         if (size != 0x7028)
            throw new Error(`MapVariant expected size 0x7028; got 0x${_byteswap_ulong(size).toString(16)} or 0x${size}.toString(16).`);
      }
      this.chunkVersion = _byteswap_ushort(stream.readUInt16()); // 08
      this.chunkFlags   = _byteswap_ushort(stream.readUInt16()); // 0A
      //
      this.hashSHA1 = stream.readBytes(0x14);
      this.hashContentLength = stream.readBytes(0x4);
      //
      {  // GameVariantHeader // header - same data as CHDR but fields aren't byte-aligned here
         let o = this.header = {};
         o.type       = stream.readBits(4, BIT_ORDER_UNKNOWN) - 1; // gvar_content_type
            // ^ "None" is encoded as 0 instead of -1 in mpvr; the whole enum is shifted up by 1
            //   when written to the file.
         // Note: As of the previous field, we are byte-aligned again.
         o.fileLength = _byteswap_ulong(stream.readUInt32());
         o.unk08      = _byteswap_uint64(stream.readUInt64());
         o.unk10      = _byteswap_uint64(stream.readUInt64());
         o.unk18      = _byteswap_uint64(stream.readUInt64());
         o.unk20      = _byteswap_uint64(stream.readUInt64());
         o.activity   = stream.readBits(3, false) - 1;
            // ^ "None" is encoded as 0 instead of -1 in mpvr; the whole enum is shifted up by 1
            //   when written to the file.
         o.gameMode   = stream.readBits(3, false);
         o.engine     = stream.readBits(3, false);
            //console.log("start of the first map ID:");
            //stream.reportOffset();
         o.mapID      = stream.readBits(32, false); // the ID of the map we're built on
            //console.log("end of the first map ID:");
            //stream.reportOffset();
         o.engineCategoryIndex = stream.readBits(8, false); // TODO: we need to sign-extend it from one byte to an SInt32
         o.createdBy   = new VariantContentAuthor();
         o.createdBy.parseBits(stream);
         o.modifiedBy  = new VariantContentAuthor();
         o.modifiedBy.parseBits(stream);
         let endianness = stream.endianness;
         stream.endianness = ENDIAN_BIG; // KSoft.Tool always uses big-endian, but MCC may be little-endian for this?
         o.title       = stream.readWidecharString(128, true);
         o.description = stream.readWidecharString(128, true);
         if (o.activity == 2)
            o.hopperID = stream.readUInt16(); // TODO: TEST ME (how?)
         else
            o.hopperID = null;
         if (this.gameMode == 1) {
            this.unk02A0 = stream.readBits(8, false);
            this.unk02A1 = stream.readBits(2, false);
            this.unk02A2 = stream.readBits(2, false);
            this.unk02A3 = stream.readBits(8, false);
            this.unk02A4 = stream.readBits(32, false);
         } else if (this.gameMode == 2) {
            this.unk02A0 = stream.readBits(2, false);
            this.unk02A4 = stream.readBits(32, false);
         }
      }
      this.unk02B0 = stream.readBits(8, false);
      if (this.unk02B0 < 31) {
         console.warn("unk2B0 < 31; Reach would abort with an error here");
      }
      this.unk02EC = stream.readBits(32, false);
      this.unk02F0 = stream.readBits(32, false);
      
      // Number of palette subfolders defined by the canvas this variant was 
      // built on. LoadedForgeObject::objectTypeForgeFolder is the index of 
      // one such subfolder and will therefore be less than this.
      this.canvasAllFoldersCount = stream.readBits(9, false); // 2B2
      
      this.mapID   = stream.readBits(32, false); // 2B4
      this.unk02E9 = stream.readBits(1, false);
      this.unk02EA = stream.readBits(1, false);
      //
      this.boundingBox = {  // 02C8, float[6]
         x: { min: 0, max: 0 },
         y: { min: 0, max: 0 },
         z: { min: 0, max: 0 },
      };
      this.boundingBox.x.min = stream.readFloat({ endianness: ENDIAN_BIG }); // float
      this.boundingBox.x.max = stream.readFloat({ endianness: ENDIAN_BIG }); // float
      this.boundingBox.y.min = stream.readFloat({ endianness: ENDIAN_BIG }); // float
      this.boundingBox.y.max = stream.readFloat({ endianness: ENDIAN_BIG }); // float
      this.boundingBox.z.min = stream.readFloat({ endianness: ENDIAN_BIG }); // float
      this.boundingBox.z.max = stream.readFloat({ endianness: ENDIAN_BIG }); // float
      
      // Max $ available on the canvas at the time this map was made. For Forge World, 
      // this would be $30000.
      this.budgetMax = stream.readBits(32, false); // 2E0
      
      // Amount of budget $ spent by the placed objects. Note that this only includes 
      // the direct cost of placed objects. Increasing the Max Count for an object 
      // type will show increased budget usage in the in-game UI but will not increase 
      // this value.
      this.budgetSpent = stream.readBits(32, false); // 2E4
      
      this.forgeLabels = {
         stringCount: 0,
         strings: []
      };
      {
         let _fl = this.forgeLabels;
         //
         _fl.stringCount = stream.readBits(9, false); // value in the range of [0, 511], though there may be a lower limit
         for(let i = 0; i < _fl.stringCount; ++i) {
            _fl.strings[i] = { offset: 0, content: "" };
            let presence = stream.readBits(1);
            if (!presence)
               continue;
            _fl.strings[i].offset = stream.readBits(12, false);
         }
         if (_fl.stringCount > 0) {
            let dataLength   = stream.readBits(13, false);
            _fl.dataLength = dataLength;
            let isCompressed = stream.readBits(1);
            _fl.isCompressed = isCompressed;
            let buffer = [];
            if (isCompressed) {
               let compressed = [];
               let compSize   = stream.readBits(13, false);
               for(let i = 0; i < compSize; i++)
                  compressed[i] = stream.readByte();
               if (pako) {
                  //let bin  = new Uint8Array(compressed);
                  let bin  = new Uint8Array(compressed.slice(4)); // skip the zlib header's uncompressed size
try {
                  let data = pako.inflate(bin);
                  //console.log(`inflated data to ${data.length} bytes; ${uncompressedSize} expected`);
                  buffer = data;
                  if (buffer.length != dataLength)
                     console.warn(`Expected ~${dataLength} bytes; got ${buffer.length} (compressed into ${compSize})`);
} catch (e) { console.log(e); return; }
               } else
                  buffer = null;
            } else {
               for(let i = 0; i < dataLength; i++)
                  buffer[i] = stream.readByte();
               buffer = new Uint8Array(buffer);
            }
            _fl.buffer = buffer;
            if (buffer) {
               let size = buffer.length;
               for(let i = 0; i < _fl.stringCount; ++i) {
                  let s = _fl.strings[i];
                  for(let k = s.offset; k < size; ++k) {
                     if (buffer[k] == 0)
                        break;
                     s.content += String.fromCharCode(buffer[k]);
                  }
               }
            }
         }
      }
      
      this.unk02B8 = {
         /*uint32_t*/ map_mcc_id: 0x00000000, // 00
         /*uint16_t*/ unk04:      0x0000, // 04
         /*uint16_t*/ unk06:      0x0000, // 06
         /*uint64_t*/ unk08:      0x0000000000000000, // 08
      };
      if (this.unk02B0 >= 32) { // added in an MCC update; don't know which
         let dst = this.unk02B8;
         dst.map_unk_id = stream.readBits(32, true);
         dst.unk04      = stream.readBits(16, false);
         dst.unk06      = stream.readBits(16, false);
         dst.unk08      = stream.readBits(64, false);
         if (!dst.map_mcc_id && !dst.unk04 && !dst.unk06) {
            dst.unk08 = _byteswap_uint64(dst.unk08);
            if (dst.unk08 == 0) {
               console.warn("unk2B8 loaded but its fields are zero; Halo: Reach would abort with a load failure at this point");
            }
         }
      } else {
         let dst = this.unk02B8 = ReachMapDefinition.make_map_variant_unk02B8(this.mapID);
         if (dst.map_mcc_id || dst.unk04 || dst.unk06 || dst.unk08) {
            this.unk02B0 = 32;
         }
      }
      
      if (this.canvasAllFoldersCount > 0x100) {
         console.warn("canvasAllFoldersCount > 0x100; Halo: Reach would abort with a load failure at this point");
      }
      this.forgeObjects = [];
      for(let i = 0; i < 0x28B; ++i) {
         this.forgeObjects[i] = new LoadedForgeObject(stream, this.boundingBox, this);
      }
      this.objectTypeMinMaxes = []; // D630 // object min/max settings
      for(let i = 0; i < 0x100; ++i) {
         // min    // 00
         // max    // 01
         // placed // 02 // pre-cached for quick budget/limit checking, I guess? :\ 
         this.objectTypeMinMaxes[i] = { min: 0, max: 0, placed: 0 };
         if (i < this.canvasAllFoldersCount) {
            this.objectTypeMinMaxes[i].min    = stream.readBits(8, false);
            this.objectTypeMinMaxes[i].max    = stream.readBits(8, false);
            this.objectTypeMinMaxes[i].placed = stream.readBits(8, false);
         }
      }
   }
}