import React, { useRef, useState, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'

import * as THREE from 'three';

import vertexShader from './vertexShader';
// import fragmentShader from './fragmentShader';

function Box(props) {
  // This reference gives us direct access to the THREE.Mesh object
  const ref = useRef()
  const shaderRef = useRef()
  // Hold state for hovered and clicked events
  const [hovered, hover] = useState(false)
  const [clicked, click] = useState(false)
  const [time, setTime]  = useState(0.0);
  const [shader, setShader] = useState({});

  // Subscribe this component to the render-loop, rotate the mesh every frame
  useFrame((state, delta) => {
    if (hovered || true) { // use hovered var to please linter
      setTime(time+delta);
    }
  });

  useFrame(() => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.iTime.value = time;
      shaderRef.current.uniforms.iResolution.value = new THREE.Vector2(window.innerWidth, window.innerHeight);
      shaderRef.current.needsUpdate = true;
    }
  })
  
  useEffect(() => {
    // fetch the shader named shaderName from shadertoys
    fetch(`https://www.shadertoy.com/api/v1/shaders/${props.shaderName}?key=NdnjRr`)
    .then(response => response.json())
    .then(data => { return data.Shader; })
    .then(shader => { setShader(shader); });
  }, [props.shaderName]);

  // Get shader.renderpass[].code where type == "Image"
  let image = (shader.renderpass ? shader.renderpass.filter((pass) => pass.type === "image") : []).map(o => o.code).join("");
  let common = (shader.renderpass ? shader.renderpass.filter((pass) => pass.type === "common") : []).map(o => o.code).join("");

  const fragmentShader = `
    uniform float iTime;
    uniform vec2 iResolution;  
    varying vec2 vUv;
    ` + common + `
    ` + image + `
    void main() {
      //mainImage(gl_FragColor, vUv * iResolution.xy);
      mainImage(gl_FragColor, gl_FragCoord.xy);
    }
  `;

  const uniforms = useMemo(() => {
    return {
      iTime: {
        value: 0.0,
      },
      iResolution: {
        value: new THREE.Vector2(window.innerWidth, window.innerHeight)
      }
    };
  }, []);

  // rotate the cube
  useFrame(() => {
    if (ref.current.rotation.y < props.roty)
      ref.current.rotation.y = Math.min(ref.current.rotation.y + 0.05, props.roty)
    else if (ref.current.rotation.y > props.roty)
      ref.current.rotation.y = Math.max(ref.current.rotation.y - 0.05, props.roty)
  })

  return (
    <mesh
      {...props}
      ref={ref}
      scale={clicked ? 1 : 1.5}
      onClick={(event) => click(!clicked)}
      onPointerOver={(event) => hover(true)}
      onPointerOut={(event) => hover(false)}>
      <boxGeometry args={[30, 30, 30]} />
      <shaderMaterial
        ref={shaderRef}
        attach='material'
        fragmentShader={fragmentShader}
        vertexShader={vertexShader}
        uniforms={uniforms}
      />
    </mesh>
  )
}

const mrangeShaderNames = ["dt3GDl", "7lKSWW"];

const shaderNames = [
  "mslfWr", // My first ray marching
  "3dXyWj"  // Simplex Noise Rotation 
  ].concat(mrangeShaderNames);

  // pick a random shader
const shaderName = shaderNames[Math.floor(Math.random() * shaderNames.length)];

function App() {
  // fill query with keystrokes
  const [query, setQuery] = useState("");
  const [roty, setRoty] = useState(0.0);

  // update query when input value changes
  useEffect(() => {
    const input = document.getElementById("search");
    input.addEventListener("input", (event) => {
      setQuery(event.target.value);
    });

    input.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = this.scrollHeight + 'px';
    });
    
    input.addEventListener("keydown", (event) => {
      // Enter with modifier shift
      if (event.key === "Enter" && !event.shiftKey) {
        // do not add the character
        event.preventDefault();
        // redirect to google search of query
        let query2 = query.replace(/\n/g, " ");
        let query3 = query2.replace(/\s/g, "+");
        window.location.href = `https://www.google.com/search?q=${query3}`;
      } else if (event.key === "ArrowLeft") {
        setRoty((x) => x - Math.PI / 2);
      } else if (event.key === "ArrowRight") {
        setRoty((x) => x + Math.PI / 2);
      } 
    });
  }, [query]);
  /*
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Backspace") {
        setQuery(query.slice(0, -1));
      } else if (event.key === "Enter") {
        // redirect to google search of query
        window.location.href = `https://www.google.com/search?q=${query}`;
    // handle left and right arrow keys
      } else if (event.key === "ArrowLeft") {
        setRoty((x) => x - Math.PI / 2);
      } else if (event.key === "ArrowRight") {
        setRoty((x) => x + Math.PI / 2);
      } else if (event.key.length > 1) {
        // do nothing
      } else {
        setQuery(query + event.key);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [query]);
  */

  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center z-10">
        <div className="relative bg-transparent w-11/12 md:w-1/2 lg:w-1/3 xl:w-1/4 rounded-lg shadow-lg z-10">
          <textarea id="search" className="w-full bg-transparent text-white text-center text-5xl rounded-lg px-4 py-2 pl-12 focus:outline-none focus:shadow-outline" type="text" placeholder="Search..." autofocus="autofocus" />
        </div>
      </div>

      <div className="fixed inset-0 flex items-center justify-center">
        <Canvas>
          <ambientLight />
          <pointLight position={[10, 10, 10]} />
          <Box shaderName={shaderName} roty={roty} position={[0, 0, -30]} />
        </Canvas>
      </div>
    </>
  );
}

export default App;
