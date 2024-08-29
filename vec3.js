class Vec3 {
   constructor(a, b, c) {
      this[0] = 0;
      this[1] = 0;
      this[2] = 0;
      if (a instanceof Array || a instanceof Vec3) {
         this[0] = a[0] || 0;
         this[1] = a[1] || 0;
         this[2] = a[2] || 0;
      } else if (+a === a) {
         this[0] = a || 0;
         this[1] = b || 0;
         this[2] = c || 0;
      }
   }
   get x() { return this[0]; }
   get y() { return this[1]; }
   get z() { return this[2]; }
   set x(v) { return this[0] = v; }
   set y(v) { return this[1] = v; }
   set z(v) { return this[2] = v; }
   
   // imagine not having operator overloads lmao
   add(/*const Vec3&*/ other) {
      for(let i = 0; i < 3; ++i)
         this[i] += other[i];
      return this;
   }
   /*Vec3*/ added(/*const Vec3&*/ other) /*const*/ {
      return (new Vec3(this)).add(other);
   }
   //
   sub(/*const Vec3&*/ other) {
      for(let i = 0; i < 3; ++i)
         this[i] -= other[i];
      return this;
   }
   /*Vec3*/ subtracted(/*const Vec3&*/ other) /*const*/ {
      return (new Vec3(this)).sub(other);
   }
   
   /*void*/ enforce_single_precision() {
      for(let i = 0; i < 3; ++i)
         this[i] = Math.fround(this[i]);
   }
   
   /*Vec3*/ cross(other) /*const*/ {
      let out = new Vec3();
      out.x = this.y*other.z - this.z*other.y;
      out.y = this.z*other.x - this.x*other.z;
      out.z = this.x*other.y - this.y*other.x;
      return out;
   }
   
   /*float*/ dot(other) /*const*/ {
      return this[0]*other[0] + this[1]*other[1] + this[2]*other[2];
   }
   
   /*float*/ length() /*const*/ {
      return Math.sqrt(Math.fround(this[0]*this[0] + this[1]*this[1] + this[2]*this[2]));
   }
   
   normalize() {
      let l = this.length();
      if (l > 0.0001) {
         this[0] /= l;
         this[1] /= l;
         this[2] /= l;
         this.enforce_single_precision(); // JS uses doubles; game uses floats
      }
      return this;
   }
   
   overwrite(other) {
      this[0] = other[0];
      this[1] = other[1];
      this[2] = other[2];
      return this;
   }
   
   // Subroutine 0x1856C in haloreach.dll version 1.3385.0.0.
   // void rotate_vector(Vec3& subject_out, const Vec3& axis, float sine, float cosine);
   /*Vec3*/ rotated_about_axis(axis, u, v) /*const*/ {
      let sine;
      let cosine;
      if (v === void 0) {
         sine   = Math.sin(u);
         cosine = Math.cos(u);
      } else {
         sine   = u;
         cosine = v;
      }
      
      let scaled_cross = this.cross(axis).scale(sine);
      let scaled_dot   = this.dot(axis) * (1.0 - cosine);
      
      // in C++, with operator overloads, this would be:
      //
      //    return axis * scaled_dot + (*this) * cosine - scaled_cross
      //
      return axis.scaled(scaled_dot).add(this.scaled(cosine)).sub(scaled_cross);
   }
   
   scale(n) {
      this[0] *= n;
      this[1] *= n;
      this[2] *= n;
      return this;
   }
   scaled(n) {
      return (new Vec3(this)).scale(n);
   }
}