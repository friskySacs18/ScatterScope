import os, sys
if os.environ.get('SCATTERSCOPE_SHADER_TOOLS'):
 sys.path.insert(0,os.environ['SCATTERSCOPE_SHADER_TOOLS'])
import moderngl
from PIL import Image
from pathlib import Path
root=Path(__file__).resolve().parents[1]
ctx=moderngl.create_standalone_context(backend='egl')
fragment=(root/'assets/chamber.frag').read_text().replace('precision highp float;','').replace('gl_FragColor','fragColor')
program=ctx.program(vertex_shader='#version 330\nin vec2 position;void main(){gl_Position=vec4(position,0.,1.);}',fragment_shader='#version 330\nout vec4 fragColor;\n'+fragment)
import struct
buffer=ctx.buffer(struct.pack('12f',-1,-1,1,-1,-1,1,-1,1,1,-1,1,1))
vao=ctx.simple_vertex_array(program,buffer,'position')
size=(1280,800);fbo=ctx.simple_framebuffer(size);fbo.use()
program['uResolution'].value=size;program['uPointer'].value=(0.,0.);program['uTime'].value=2.;program['uTransit'].value=0.
out=Path(os.environ.get('SCATTERSCOPE_RENDER_DIR','/tmp/scatterscope-chamber-qa'));out.mkdir(exist_ok=True)
for progress in [0.0,0.25,0.44,0.7,1.0]:
 program['uOpening'].value=progress;vao.render()
 Image.frombytes('RGB',size,fbo.read(components=3)).transpose(Image.Transpose.FLIP_TOP_BOTTOM).save(out/f'frame-{progress}.png')
print('Compiled and rendered five 3D frames:',ctx.info['GL_RENDERER'])
if '--video' in sys.argv:
 import subprocess
 size=(1280,800);fbo.use();program['uResolution'].value=size
 encoder=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pixel_format','rgb24','-video_size','1280x800','-framerate','30','-i','-','-vf','vflip','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(out/'scatterscope-motion.mp4')],stdin=subprocess.PIPE)
 for frame in range(120):
  progress=min(1.,frame/30);program['uOpening'].value=progress;program['uTime'].value=frame/30;program['uPointer'].value=(.6*__import__('math').sin(frame/50),.15)
  vao.render();encoder.stdin.write(fbo.read(components=3))
 encoder.stdin.close();assert encoder.wait()==0
 print('Rendered motion preview:',out/'scatterscope-motion.mp4')
size=(390,844);mobile=ctx.simple_framebuffer(size);mobile.use();program['uResolution'].value=size;program['uOpening'].value=1.;vao.render();Image.frombytes('RGB',size,mobile.read(components=3)).transpose(Image.Transpose.FLIP_TOP_BOTTOM).save(out/'mobile.png')
