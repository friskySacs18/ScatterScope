precision highp float;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uTime;
uniform float uOpening;
uniform float uTransit;
uniform float uWorld;
uniform float uChapter;
#define PI 3.14159265
mat2 rotate(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
vec2 chamber(vec3 p){
  p.xy=rotate(-.32)*p.xy;p.xz=rotate(.36)*p.xz;
  float layer=clamp(floor(p.z/1.02+.5),-3.,3.);
  vec3 q=p; q.z-=layer*1.02+.06*sin(uTime*.4+layer);q.xz=rotate(.09*sin(layer*.6+uTime*.2))*q.xz;
  float radius=1.18+.1*cos(layer*.85+uTime*.2);
  q.xy=rotate(layer*.16+uTime*.055)*q.xy;
  vec2 section=abs(vec2(length(q.xy)-radius,q.z))-vec2(.11,.075);
  float ring=length(max(section,0.))+min(max(section.x,section.y),0.)-.035;
  float collar=length(vec2(length(q.xy)-(radius+.13),q.z))-.022;
  float glass=length(vec2(length(q.xy)-(radius-.145),q.z+.04))-.016;
  float teeth=length(vec2(length(q.xy)-(radius+.06),q.z))-.087;
  float angle=atan(q.y,q.x);
  teeth+=.002*sin(angle*120.);
  float d=min(ring,collar);d=min(d,teeth);
  vec2 result=vec2(d,1.);
  if(glass<result.x)result=vec2(glass,2.+mod(layer+3.,2.));
  return result;
}
vec3 environment(vec3 d){
  float ribbon=pow(max(0.,1.-abs(d.y-.5)*2.8),18.);
  float cool=pow(max(0.,dot(d,normalize(vec3(-1.,.5,1.)))),28.);
  float warm=pow(max(0.,dot(d,normalize(vec3(1.,.3,-1.)))),18.);
  return vec3(.025,.036,.04)+ribbon*vec3(.8,.9,1.)+cool*vec3(.17,.6,.9)*2.+warm*vec3(1.,.57,.19)*2.;
}
vec3 normalAt(vec3 p){vec2 e=vec2(.001,0.);return normalize(vec3(chamber(p+e.xyy).x-chamber(p-e.xyy).x,chamber(p+e.yxy).x-chamber(p-e.yxy).x,chamber(p+e.yyx).x-chamber(p-e.yyx).x));}
float hash21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float cloud(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1.,0.)),f.x),mix(hash21(i+vec2(0.,1.)),hash21(i+vec2(1.,1.)),f.x),f.y);}
vec3 deepSpace(vec3 direction){
  vec2 sky=direction.xy/(abs(direction.z)+.65);
  float fog=cloud(sky*2.4+vec2(uTime*.009,0.))*.65+cloud(sky*5.8)*.35;
  float band=exp(-pow((sky.y+sky.x*.35-.2)*2.,2.));
  vec3 color=vec3(.007,.012,.022)+vec3(.015,.027,.044)*fog*band;
  color+=vec3(.025,.012,.035)*pow(fog,3.)*band;
  for(int i=0;i<3;i++){
    float level=float(i);vec2 grid=(sky+vec2(level*11.,level*5.))* (65.+level*50.);
    vec2 cell=floor(grid);vec2 point=fract(grid)-vec2(.18+.64*hash21(cell),.18+.64*hash21(cell+9.));
    float seed=hash21(cell+level*7.);float star=exp(-dot(point,point)*(210.+level*60.))*step(.986,seed);
    vec3 tint=mix(vec3(.4,.65,.9),vec3(.9,.75,.5),hash21(cell+23.));
    color+=star*tint*(.4+level*.08);
  }
  return color;
}
void main(){
  vec2 uv=(gl_FragCoord.xy*2.-uResolution)/uResolution.y;
  float intro=1.-smoothstep(.55,1.,uOpening);
  float fly=smoothstep(0.,.75,uOpening);
  float aspect=uResolution.x/uResolution.y;
  uv.x-=mix(min(.68,aspect*.3),0.,intro);
  uv.x-=uWorld*min(.34,aspect*.13);
  float chapterAngle=uChapter*.45;
  vec3 orbit=vec3(4.6+uPointer.x*1.2,3.5+uPointer.y*.9,5.0);
  orbit=mix(orbit,vec3(5.2*cos(chapterAngle)+uPointer.x*.65,2.4+sin(chapterAngle*.7)*1.15+uPointer.y*.5,5.2*sin(chapterAngle)+2.4),uWorld);
  vec3 ro=mix(orbit,vec3(.06*sin(uOpening*6.),.02,-7.5+fly*10.5),intro);
  ro*=1.-uTransit*.55;
  vec3 target=mix(vec3(0.),vec3(0.,0.,5.),intro);
  vec3 forward=normalize(target-ro),right=normalize(cross(forward,vec3(0.,1.,0.))),up=cross(right,forward);
  vec3 rd=normalize(forward*mix(mix(2.45,1.72,uWorld),1.85,intro)+right*uv.x+up*uv.y);
  float distance=0.,material=0.,glow=0.;vec3 p=ro;
  for(int i=0;i<80;i++){
    p=ro+rd*distance;vec2 hit=chamber(p);
    glow+=.00042/(.012+abs(hit.x))*exp(-distance*.11);
    if(hit.x<.0018){material=hit.y;break;}
    distance+=max(hit.x*.78,.0025);if(distance>22.)break;
  }
  vec3 col=deepSpace(rd);
  col+=vec3(.02,.035,.04)*exp(-dot(uv,uv)*.3);
  if(material>0.){
    vec3 n=normalAt(p),reflected=reflect(rd,n);
    float fresnel=pow(1.-max(dot(-rd,n),0.),4.);
    vec3 light=normalize(vec3(-3.,5.,4.));
    float diffuse=max(dot(n,light),0.);
    float ao=clamp(chamber(p+n*.12).x/.12,.25,1.);
    float spec=pow(max(dot(reflect(-light,n),-rd),0.),60.);
    vec3 metal=environment(reflected)*(.65+fresnel*.95)+vec3(.1,.12,.13)*diffuse+vec3(.9)*spec;
    float grain=sin(p.z*240.)*sin(p.x*190.+p.y*140.)*.003;
    col=metal*ao+grain;
    if(material>1.5){vec3 tint=material>2.5?vec3(1.,.46,.12):vec3(.15,.75,.86);col=tint*(.8+fresnel*2.5)+environment(reflected)*.5;}
    col=mix(col,vec3(.012,.019,.025),1.-exp(-distance*.024));
  }
  vec3 localOrigin=ro,localRay=rd;
  localOrigin.xy=rotate(-.32)*localOrigin.xy;localOrigin.xz=rotate(.36)*localOrigin.xz;
  localRay.xy=rotate(-.32)*localRay.xy;localRay.xz=rotate(.36)*localRay.xz;
  for(int j=0;j<7;j++){
    float layer=float(j)-3.;float z=layer*1.02+.06*sin(uTime*.4+layer);
    float travel=(z-localOrigin.z)/(localRay.z+.00001);
    vec2 lens=(localOrigin+localRay*travel).xy;
    float radial=length(lens);float radius=1.02+.1*cos(layer*.85+uTime*.2);
    if(travel>0.&&travel<distance&&radial<radius){
      float angle=atan(lens.y,lens.x);
      float wave=sin(radial*24.-angle*2.+layer*.8-uTime*.8);
      float thread=pow(max(0.,wave),24.);
      float contour=pow(max(0.,sin(radial*65.+sin(angle*3.+uTime*.2)*2.)),32.);
      vec3 tint=.5+.5*cos(vec3(.1,1.8,3.2)+radial*3.+layer*.25);
      float rim=pow(radial/radius,8.);
      float falloff=smoothstep(0.,.15,radius-radial);
      col+=(tint*thread*.16+vec3(.1,.5,.65)*contour*.08+tint*rim*.12)*falloff*exp(-travel*.04);
    }
  }
  col+=glow*mix(vec3(.06,.23,.28),vec3(.1,.29,.34)+vec3(.16,.08,.01)*(.5+.5*sin(uChapter*1.7)),uWorld);
  float pulse=exp(-pow((uOpening-.44)*19.,2.))*intro;
  float beam=exp(-abs(uv.y)*110.)*exp(-abs(uv.x)*1.1);
  float shockRadius=.08+(uOpening-.4)*1.9;
  float shock=exp(-abs(length(uv-vec2(.17,0.))-shockRadius)*72.)*smoothstep(.38,.47,uOpening)*(1.-smoothstep(.58,.76,uOpening));
  float prism=exp(-pow((uOpening-.5)*17.,2.))*exp(-abs(uv.y)*34.)*(.35+.65*exp(-abs(uv.x)*1.8));
  col+=pulse*(beam*vec3(.55,.82,1.)+exp(-dot(uv,uv)*8.)*vec3(.5,.66,.8));
  col+=shock*vec3(.22,.62,.78)+prism*vec3(.18,.05,.28);
  col*=1.-.32*smoothstep(.3,1.7,length(uv));
  col=vec3(1.)-exp(-col*1.3);
  col=pow(max(col,0.),vec3(.82));
  gl_FragColor=vec4(col,1.);
}
