
// requires Vec3

class ForgeRotation {
   //
   // Halo: Reach rotations:
   //  - Counterclockwise
   //  - X and Y are lateral
   //  - Z is vertical
   //  - Unrotated object-forward is generally (1, 0, 0)
   //     - Verified with Hill Markers
   //     - Some objects are set up oddly in regards to this; for example, 
   //       the local forward on Bunker, Round is the ramp, not the doorway.
   //
   constructor() {
      this.up_vector      = new Vec3(0, 0, 1);
      this.yaw_angle      = 0;
      this.forward_vector = new Vec3(0, 1, 0);
   }
   
   get loaded_yaw_degrees() {
      return this.yaw_angle * 180 / Math.PI;
   }
   
   static LOOKUP_TABLE = [
      //
      // The first entry in every pair is a repeating bit pattern where every other 
      // bit is set. The first-column pairs have the least-significant bit cleared; 
      // the second-column pairs have the least-significant bit set.
      //
      // The second entry in each pair is the scale, computed as roughly the square 
      // root of the bit pattern.
      //
      [      0xA,  0x002], [     0x15,  0x003],
      [     0x2A,  0x005], [     0x55,  0x008],
      [     0xAA,  0x00C], [    0x155,  0x011],
      [    0x2AA,  0x019], [    0x555,  0x023],
      [    0xAAA,  0x033], [   0x1555,  0x048],
      [   0x2AAA,  0x067], [   0x5555,  0x092],
      [   0xAAAA,  0x0D0], [  0x15555,  0x126],
      [  0x2AAAA,  0x1A1], [  0x55555,  0x24E], // We only use the first pair in this row.
      [  0xAAAAA,  0x343], [ 0x155555,  0x49D],
      [ 0xAAAAAA,  0x687], [ 0x555555,  0x93B],
      [0x2AAAAAA, 0x1A1F], [0x5555555, 0x24F4],
      [0xAAAAAAA, 0x3440]
   ];
   
   static #fabs(/*double*/ n) {
      // return std::bit_cast<double>(std::bit_cast<uint64_t>(n) & 0x7FFFFFFFFFFFFFFF);
      return Math.abs(n);
   }
   //
   static #int32_t(n) {
      return Math.trunc(n);
   }
   static #uint32_t(n) {
      return n & 0xFFFFFFFF;
   }
   
   /*uint32_t*/ encode_axis(bitcount) /*const*/ {
      //
      // Encoding works like this:
      //
      //  - The component of the up-vector that has the greatest magnitude is always 
      //    encoded as 1 or -1. When saving, we extend the vector to allow for this, 
      //    and after loading, we normalize the vector.
      //
      //     - For example, if the X-component has the largest magnitude, then we'll 
      //       force it to (+/-)1, and then divide the other components by its prior 
      //       value. The closer X was to (+/-)1, the closer the others were to 0, 
      //       so in practice all components remain in the range [-1, 1].
      // 
      //  - The above enables a useful optimization: instead of serializing all three 
      //    components, we need only store two components plus an enum that tells us 
      //    which of the three components we skipped (and what its sign was).
      //
      //  - Accordingly, the bitfield is divided into six ranges (three components 
      //    and two signs). The clever thing is that we don't waste bits on the enum 
      //    specifically. Rather, we take a bit pattern that "loops" over most of 
      //    the bits, and we multiply that pattern by the enum; then, we add it to 
      //    the two encoded axes.
      //
      //    The pattern in question consists of alternating bits, e.g. 010101010. No 
      //    matter what we multiply it by (in the range [0, 5] anyway), nearly all 
      //    of the bits develop a consistent pattern: they may still alternate, they 
      //    may all be cleared, they may all be set, but all of the bits except the 
      //    start and end have a uniform arrangement. My intuition tells me that this 
      //    unique detail makes it possible to separate the axes out from the pattern 
      //    but I don't really have a brain for numbers so I can't explain how. What 
      //    I presume is that the result of this is that all of our bits are used to 
      //    encode the two axes, rather than us burning 3 bits on the enum.
      //
      //  - As for how we encode the axes? We take the square root of the bit pattern, 
      //    subtract 1 from it, and multiply both axes by half of that. Then, we take 
      //    axis A and multiply it by the square root again. So if the bit pattern is 
      //    Z, then we encode (sqrt(Z)^2 - 2sqrt(Z))A + (sqrt(Z) - 2)B bearing in mind 
      //    that we'll lose some funky decimals since a lot of this uses integers.
      //
      //  - Finally, we added the encoded axes to the multiplied bit pattern. The 
      //    result:
      //
      //       Serialized = (Pattern * Enum)
      //                  + A * (Pattern - 2*sqrt(Pattern))
      //                  + B * (sqrt(Pattern) - 2)
      //
      if (bitcount < 6)
         throw new Error("The game doesn't support bitcounts below 6.");
      
      let fabs = this.constructor.#fabs;
      //
      let int32_t  = this.constructor.#int32_t;
      let uint32_t = this.constructor.#uint32_t;
      
      let x     = this.up_vector.x;
      let y     = this.up_vector.y;
      let z     = this.up_vector.z;
      let pos_x = fabs(x);
      let pos_y = fabs(y);
      let pos_z = fabs(z);
      
      let type;
      let axis_a; // xmm4
      let axis_b; // xmm3
      if (pos_x > pos_y && pos_x > pos_z) {
         type = (x > 0) ? 0 : 3;
         axis_a = y / pos_x;
         axis_b = z / pos_x;
      } else if (pos_y > pos_x && pos_y > pos_z) {
         type = (y > 0) ? 1 : 4;
         axis_a = x / pos_y;
         axis_b = z / pos_y;
      } else {
         type = (z > 0) ? 2 : 5;
         axis_a = x / pos_z;
         axis_b = y / pos_z;
      }
      
      axis_a += 1.0;
      axis_b += 1.0;
      axis_a = Math.max(0, int32_t(axis_a));
      axis_b = Math.max(0, int32_t(axis_b));
      
      let bit_pattern    = this.constructor.LOOKUP_TABLE[bitcount - 6][0];
      let pattern_sqrt   = this.constructor.LOOKUP_TABLE[bitcount - 6][1];
      let per_axis_scale = /*(float)*/(pattern_sqrt - 1);
      let per_axis_max   = pattern_sqrt - 2;
      
      axis_a = axis_a * per_axis_scale / 2;
      axis_b = axis_b * per_axis_scale / 2;
      axis_a = Math.min(axis_a, per_axis_max);
      axis_b = Math.min(axis_b, per_axis_max);
      
      // Separate axis A from axis B:
      axis_a *= pattern_sqrt; // So A is ultimately multiplied by (pattern_sqrt^2 - 2*pattern_sqrt).
      
      return (bit_pattern * type) + axis_a + axis_b;
   }
   
   /*void*/ decode_axis(bitcount, bits) {
      if (bitcount < 6)
         throw new Error("The game doesn't support bitcounts below 6.");
      
this.__up_vector_bits = bits;
      let uint32_t = this.constructor.#uint32_t;
      
      let bit_pattern    = this.constructor.LOOKUP_TABLE[bitcount - 6][0];
      let pattern_sqrt   = this.constructor.LOOKUP_TABLE[bitcount - 6][1];
      let per_axis_scale = /*(float)*/(pattern_sqrt - 1);
      let per_axis_max   = pattern_sqrt - 2; // r8
      //
      // Separate out the type:
      //
      let type = uint32_t(bits / bit_pattern); // r11
      bits -= bit_pattern * type;
      //
      // Separate out Axis A:
      //
      let xmm1 = uint32_t(bits / pattern_sqrt);
      bits -= pattern_sqrt * xmm1;
      
      let var_a = xmm1 * 2;
      
      let xmm2 = 2 / per_axis_scale;
      let xmm3 = 1 / per_axis_scale;
      
      let axis_a = xmm1 * xmm2;
      axis_a -= 1.0;
      axis_a += xmm3;
      if (var_a == per_axis_max) {
         axis_a = 0.0;
      }
      //
      // Axis B is all that's left:
      //
      let eax = bits * 2;
      let axis_b = per_axis_scale * xmm2;
      axis_b -= 1.0;
      axis_b += xmm3;
      if (bits * 2 == per_axis_max) {
         axis_b = 0.0;
      }
      //
      // Put 'em all together.
      //
      let dst = this.up_vector;
this.__up_vector_type = type;
      switch (type) {
         case 0:
            dst.x = 1.0;
            dst.y = axis_a; // xmm1
            dst.z = axis_b; // xmm0
            break;
         case 1:
            dst.x = axis_a;
            dst.y = 1.0;
            dst.z = axis_b;
            break;
         case 2:
            dst.x = axis_a;
            dst.y = axis_b;
            dst.z = 1.0;
            break;
         case 3:
            dst.x = -1.0;
            dst.y = axis_a;
            dst.z = axis_b;
            break;
         case 4:
            dst.x = axis_a;
            dst.y = -1.0;
            dst.z = axis_b;
            break;
         case 5:
            dst.x = axis_a;
            dst.y = axis_b;
            dst.z = -1.0;
            break;
         default: // invalid type
            dst.x = 0.0;
            dst.y = 0.0;
            dst.z = 1.0;
            break;
      }
      dst.normalize();
   }

   // Subroutine 0xDBF14 in haloreach.dll version 1.3385.0.0.
   //
   // Given one vector `a` which defines the up-vector of a reference frame, 
   // compute the other two axes of that reference frame and store them in 
   // `b` (forward) and `c` (side).
   static /*void*/ subDBF14(/*const Vec3&*/ a, /*Vec3&*/ b, /*Vec3&*/ c) {
      let fabs = this.#fabs;
      //
      let int32_t  = this.#int32_t;
      let uint32_t = this.#uint32_t;
      
      const WORLD_Y_AXIS = new Vec3(0, 1, 0);
      const WORLD_X_AXIS = new Vec3(1, 0, 0);
      
      //
      // We need to compute the forward vector by taking the cross product of 
      // the input up vector and an appropriate lateral world axis. Of course, 
      // a vector cross itself is zero, so if the up vector happens to be 
      // parallel to world-X, we need to use world-Y, and vice versa. What 
      // we'll do is just cross local-Z with whichever of world-X and world-Y 
      // it's *least* aligned with.
      //
      // Presuming `a` is a unit vector, the dot product of `a` with any other 
      // unit vector will be in the range [-1, 1], being zero if the two unit 
      // vectors are perpendicular to one another, and further from zero if 
      // they point in the same direction or opposing directions.
      //
      let xmm3 = fabs(a.dot(WORLD_X_AXIS));
      let xmm0 = fabs(a.dot(WORLD_Y_AXIS));
      if (xmm0 > xmm3) {
         //
         // If the `a` vector is more aligned with the world Y-axis (or its 
         // inverse) than the world X-axis (or its inverse), then set `b` to 
         // the cross product of `a` with the world X-axis.
         //
         b.x = 0;
         b.y = a.z;
         b.z = -a.y;
      } else {
         //
         // Otherwise, set `b` to the cross product of `a` with the world Y-axis.
         //
         b.x = a.z;
         b.y = 0;
         b.z = -a.x;
      }
      b.normalize();
      
      c.overwrite(a.cross(b)).normalize();
   }

   /*uint32_t*/ encode_angle() /*const*/ {
      throw new Error("not implemented!");
   }
   
   /*void*/ decode_angle(bits) {
      const PI = 3.1415927; // float
      
      let xmm1 = bits * 0.0003834952 - PI + 0.0001917476;
      xmm1 = Math.fround(xmm1); // avoid issues with JS float precision.
      this.yaw_angle = xmm1;
      
      let b = new Vec3();
      let c = new Vec3();
      this.constructor.subDBF14(this.up_vector, b, c);
      
      this.forward_vector.x = b.x;
      this.forward_vector.y = b.y;
      this.forward_vector.z = b.z;
      
      let xmm7;
      let xmm0;
      if (xmm1 == PI || xmm1 == -PI) {
         xmm7 = 0;
         xmm0 = -1.0;
      } else {
         xmm7 = Math.sin(xmm1);
         xmm0 = Math.cos(xmm1);
      }
      this.forward_vector.overwrite(this.forward_vector.rotated_about_axis(this.up_vector, xmm7, xmm0));
      this.forward_vector.normalize();
   }
};