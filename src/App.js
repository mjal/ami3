import React, { useRef, useState, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'

import * as THREE from 'three';

import vertexShader from './vertexShader';
import fragmentShader from './fragmentShader';

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
    setTime(time+delta);
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
    ` + common + `
    ` + image + `
    void main() {
      mainImage(gl_FragColor, gl_FragCoord.xy);
    }
  `;

  const uniforms = useMemo(() => {
    return {
      iTime: {
        value: time,
      },
      iResolution: {
        value: new THREE.Vector2(window.innerWidth, window.innerHeight)
      }
    };
  }, []);

  // rotate the cube
  useFrame(() => {
    //ref.current.rotation.x = ref.current.rotation.y += 0.01;
    //ref.current.rotation.x = ref.current.rotation.x + 0.01 % 360;
    console.log(ref.current.rotation.x)
  })

  return (
    <mesh
      {...props}
      ref={ref}
      scale={clicked ? 1 : 1.5}
      onClick={(event) => click(!clicked)}
      onPointerOver={(event) => hover(true)}
      onPointerOut={(event) => hover(false)}>
      <boxGeometry args={[10, 10, 10]} />
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

const shaderNames = ["mslfWr", "3dXyWj", "dt3GDl"];
//const shaderNames = ["dt3GDl"];
// pick a random shader
const shaderName = shaderNames[Math.floor(Math.random() * shaderNames.length)];


function App() {
  // fill query with keystrokes
  const [query, setQuery] = useState("");
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Backspace") {
        setQuery(query.slice(0, -1));
      } else if (event.key === "Enter") {
        // redirect to google search of query
        window.location.href = `https://www.google.com/search?q=${query}`;
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

  return (
    <Canvas>
      <Text fontSize={0.5} position={[0, 0, 0]}>{query}</Text>

      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <Box shaderName={shaderName} position={[0, 0, -10]} />
    </Canvas>
  );
}

export default App;
