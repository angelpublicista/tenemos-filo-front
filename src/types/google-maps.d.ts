// Tipos minimos de Google Maps: solo lo que se usa.
//
// Se declaran a mano en vez de traer @types/google.maps porque de toda la
// libreria aqui se usan cuatro cosas, y ese paquete son miles de lineas que
// habria que mantener al dia sin necesidad.
declare global {
  interface Window {
    google?: typeof google;
  }

  namespace google.maps {
    interface LatLngLiteral {
      lat: number;
      lng: number;
    }
    interface LatLng {
      lat(): number;
      lng(): number;
    }
    class Map {
      constructor(el: HTMLElement, opciones: Record<string, unknown>);
      setCenter(p: LatLngLiteral): void;
      getCenter(): LatLng;
      setZoom(z: number): void;
      addListener(evento: string, cb: (e: { latLng: LatLng }) => void): void;
    }
    class Marker {
      constructor(opciones: Record<string, unknown>);
      setPosition(p: LatLngLiteral): void;
      setMap(m: Map | null): void;
      addListener(evento: string, cb: (e: { latLng: LatLng }) => void): void;
    }
    class Geocoder {
      geocode(
        peticion: { address: string; region?: string },
      ): Promise<{ results: Array<{ geometry: { location: LatLng } }> }>;
    }
  }
}

export {};
