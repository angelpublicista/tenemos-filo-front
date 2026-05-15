export interface ColombiaDepartment {
  name: string;
  cities: string[];
}

export const COLOMBIA_DEPARTMENTS: ColombiaDepartment[] = [
  {
    name: 'Amazonas',
    cities: ['Leticia', 'Puerto Nariño'],
  },
  {
    name: 'Antioquia',
    cities: [
      'Medellín', 'Bello', 'Itagüí', 'Envigado', 'Apartadó', 'Rionegro', 'Turbo',
      'Copacabana', 'Sabaneta', 'La Estrella', 'Caldas', 'Girardota', 'Barbosa',
      'Necoclí', 'Urrao', 'Caucasia', 'Yarumal', 'El Bagre', 'Marinilla', 'Guarne',
      'La Ceja', 'Chigorodó', 'Amagá', 'Puerto Berrío', 'Segovia', 'Santa Fe de Antioquia',
      'Sonsón', 'Andes', 'Ciudad Bolívar', 'Jericó', 'Fredonia',
    ],
  },
  {
    name: 'Arauca',
    cities: ['Arauca', 'Tame', 'Saravena', 'Fortul', 'Puerto Rondón', 'Cravo Norte', 'Arauquita'],
  },
  {
    name: 'Atlántico',
    cities: [
      'Barranquilla', 'Soledad', 'Malambo', 'Sabanalarga', 'Puerto Colombia', 'Galapa',
      'Baranoa', 'Palmar de Varela', 'Ponedera', 'Santo Tomás', 'Sabanagrande',
      'Polonuevo', 'Candelaria', 'Luruaco', 'Suan', 'Usiacurí', 'Manatí', 'Tubará',
      'Juan de Acosta', 'Repelón', 'Piojó', 'Campo de la Cruz', 'Santa Lucía',
    ],
  },
  {
    name: 'Bogotá D.C.',
    cities: ['Bogotá'],
  },
  {
    name: 'Bolívar',
    cities: [
      'Cartagena', 'Magangué', 'Turbaco', 'Arjona', 'El Carmen de Bolívar', 'San Pablo',
      'Mompós', 'Santa Rosa del Sur', 'San Juan Nepomuceno', 'Santa Rosa', 'María La Baja',
      'Calamar', 'San Jacinto', 'Simití', 'Achí', 'Turbaná', 'Clemencia', 'Villanueva',
      'Mahates', 'San Estanislao', 'Córdoba', 'Zambrano',
    ],
  },
  {
    name: 'Boyacá',
    cities: [
      'Tunja', 'Duitama', 'Sogamoso', 'Chiquinquirá', 'Paipa', 'Villa de Leyva',
      'Puerto Boyacá', 'Moniquirá', 'Garagoa', 'Aquitania', 'Tibasosa', 'Nobsa',
      'Soatá', 'Samacá', 'Ramiriquí', 'Miraflores', 'Saboyá', 'Ventaquemada',
      'Güicán', 'Socotá', 'Belén', 'Tota',
    ],
  },
  {
    name: 'Caldas',
    cities: [
      'Manizales', 'La Dorada', 'Villamaría', 'Chinchiná', 'Anserma', 'Riosucio',
      'Supía', 'Aguadas', 'Pensilvania', 'Salamina', 'Neira', 'Palestina', 'Viterbo',
      'Manzanares', 'Marmato', 'Aranzazu', 'Filadelfia', 'Samaná', 'Victoria',
    ],
  },
  {
    name: 'Caquetá',
    cities: [
      'Florencia', 'San Vicente del Caguán', 'Puerto Rico', 'La Montañita', 'El Doncello',
      'Belén de los Andaquíes', 'Cartagena del Chairá', 'Curillo', 'Solita', 'Morelia',
      'Albania', 'El Paujíl', 'Milán', 'San José del Fragua', 'Valparaíso',
    ],
  },
  {
    name: 'Casanare',
    cities: [
      'Yopal', 'Aguazul', 'Tauramena', 'Villanueva', 'Paz de Ariporo', 'Monterrey',
      'Maní', 'Trinidad', 'Hato Corozal', 'Orocué', 'Nunchía', 'Pore', 'San Luis de Palenque',
      'Recetor', 'Sabanalarga', 'Sácama', 'Támara', 'Chameza', 'La Salina',
    ],
  },
  {
    name: 'Cauca',
    cities: [
      'Popayán', 'Santander de Quilichao', 'Patía', 'Puerto Tejada', 'Guapi', 'Piendamó',
      'Caloto', 'Toribío', 'Miranda', 'Timbío', 'Morales', 'Bolívar', 'Cajibío',
      'El Tambo', 'Argelia', 'Corinto', 'Silvia', 'Totoró', 'Inzá', 'Páez',
      'Rosas', 'La Sierra', 'Timbiquí', 'López de Micay',
    ],
  },
  {
    name: 'Cesar',
    cities: [
      'Valledupar', 'Aguachica', 'Bosconia', 'Codazzi', 'Curumaní', 'La Jagua de Ibirico',
      'Chiriguaná', 'Chimichagua', 'El Copey', 'San Alberto', 'Pailitas', 'Pelaya',
      'La Paz', 'Manaure Balcón del Cesar', 'Astrea', 'Becerril', 'El Paso', 'Gamarra',
      'González', 'Pueblo Bello', 'San Diego', 'Tamalameque', 'San Martín', 'Río de Oro',
    ],
  },
  {
    name: 'Chocó',
    cities: [
      'Quibdó', 'Istmina', 'Condoto', 'Tadó', 'Acandí', 'Bahía Solano', 'Bajo Baudó',
      'Riosucio', 'Juradó', 'Carmen del Darién', 'Novita', 'Lloró', 'Bojayá', 'Nuquí',
      'Unguía', 'Alto Baudó', 'Sipí', 'Medio San Juan',
    ],
  },
  {
    name: 'Córdoba',
    cities: [
      'Montería', 'Cereté', 'Lorica', 'Sahagún', 'Montelíbano', 'Planeta Rica',
      'Tierralta', 'Ciénaga de Oro', 'San Andrés de Sotavento', 'San Pelayo', 'Chinú',
      'Pueblo Nuevo', 'Ayapel', 'Puerto Libertador', 'Tuchín', 'Valencia', 'Canalete',
      'Los Córdobas', 'Moñitos', 'San Antero', 'San Bernardo del Viento',
    ],
  },
  {
    name: 'Cundinamarca',
    cities: [
      'Soacha', 'Fusagasugá', 'Facatativá', 'Chía', 'Zipaquirá', 'Girardot', 'Mosquera',
      'Madrid', 'Funza', 'Cajicá', 'Tocancipá', 'Sibaté', 'La Calera', 'Cota', 'Tenjo',
      'Ubaté', 'Villeta', 'Pacho', 'Anapoima', 'La Mesa', 'Guaduas', 'Tabio', 'Sopó',
      'Sesquilé', 'Gachancipá', 'Subachoque', 'El Rosal', 'Bojacá', 'Tocaima', 'Anolaima',
      'Silvania', 'Pandi', 'Arbeláez', 'Cáqueza', 'Choachí', 'Ubalá', 'Gachalá',
      'Medina', 'Guayabetal', 'Apulo', 'Nilo', 'Agua de Dios', 'Ricaurte', 'Nariño',
    ],
  },
  {
    name: 'Guainía',
    cities: ['Inírida', 'Barranco Minas', 'San Felipe', 'Puerto Colombia', 'La Guadalupe', 'Cacahual', 'Pana Pana', 'Morichal'],
  },
  {
    name: 'Guaviare',
    cities: ['San José del Guaviare', 'Calamar', 'El Retorno', 'Miraflores'],
  },
  {
    name: 'Huila',
    cities: [
      'Neiva', 'Pitalito', 'Garzón', 'La Plata', 'Campoalegre', 'Gigante', 'Aipe',
      'Palermo', 'Rivera', 'Baraya', 'Hobo', 'Agrado', 'Acevedo', 'Suaza', 'San Agustín',
      'Isnos', 'Timaná', 'Altamira', 'Guadalupe', 'Tello', 'Paicol', 'Yaguará',
      'Íquira', 'Tesalia', 'Nátaga', 'Colombia', 'Villavieja', 'Aipe',
    ],
  },
  {
    name: 'La Guajira',
    cities: [
      'Riohacha', 'Maicao', 'Uribia', 'Manaure', 'San Juan del Cesar', 'Villanueva',
      'Barrancas', 'Fonseca', 'El Molino', 'Dibulla', 'Albania', 'Urumita', 'Hatonuevo',
      'Distracción', 'La Jagua del Pilar',
    ],
  },
  {
    name: 'Magdalena',
    cities: [
      'Santa Marta', 'Ciénaga', 'Fundación', 'Aracataca', 'Zona Bananera', 'Pivijay',
      'El Banco', 'Plato', 'Sitionuevo', 'Tenerife', 'Pueblo Viejo', 'Algarrobo',
      'Ariguaní', 'Chivolo', 'El Retén', 'Guamal', 'Pedraza', 'Remolino', 'Salamina',
      'San Sebastián de Buenavista', 'San Zenón', 'Santa Ana', 'Santa Bárbara de Pinto',
      'Sabanas de San Ángel', 'Zapayán',
    ],
  },
  {
    name: 'Meta',
    cities: [
      'Villavicencio', 'Acacías', 'Granada', 'Puerto López', 'Puerto Gaitán', 'Cumaral',
      'Restrepo', 'San Martín', 'Puerto Rico', 'Puerto Lleras', 'San Carlos de Guaroa',
      'Vistahermosa', 'Fuente de Oro', 'Cabuyaro', 'Castilla la Nueva', 'El Calvario',
      'El Castillo', 'El Dorado', 'Guamal', 'Lejanías', 'Mapiripán', 'Mesetas',
      'La Macarena', 'La Uribe', 'Puerto Concordia', 'San Juan de Arama', 'San Juanito',
    ],
  },
  {
    name: 'Nariño',
    cities: [
      'Pasto', 'Tumaco', 'Ipiales', 'Túquerres', 'Samaniego', 'La Unión', 'Sandoná',
      'Barbacoas', 'El Charco', 'Cumbal', 'Buesaco', 'La Cruz', 'Taminango', 'Potosí',
      'Consacá', 'Ancuya', 'Arboleda', 'Belén', 'Chachagüí', 'Córdoba', 'Cuaspud',
      'El Peñol', 'El Rosario', 'El Tablón de Gómez', 'El Tambo', 'Guachucal',
      'Guaitarilla', 'Gualmatán', 'Imués', 'La Florida', 'La Llanada', 'Linares',
      'Los Andes', 'Mallama', 'Nariño', 'Ospina', 'Pupiales', 'Ricaurte',
      'San Bernardo', 'San Lorenzo', 'San Pedro de Cartago', 'Tangua', 'Yacuanquer',
    ],
  },
  {
    name: 'Norte de Santander',
    cities: [
      'Cúcuta', 'Ocaña', 'Pamplona', 'Los Patios', 'Villa del Rosario', 'El Zulia',
      'Tibú', 'Puerto Santander', 'Chinácota', 'Ábrego', 'Sardinata', 'Convención',
      'Teorama', 'San Cayetano', 'Arboledas', 'Bochalema', 'Bucarasica', 'Cáchira',
      'Cácota', 'Chitagá', 'Cucutilla', 'Durania', 'El Carmen', 'El Tarra',
      'Gramalote', 'Hacarí', 'Herrán', 'La Esperanza', 'La Playa', 'Labateca',
      'Lourdes', 'Mutiscua', 'Pamplonita', 'Ragonvalia', 'Salazar', 'San Calixto',
      'Santiago', 'Silos', 'Toledo', 'Villa Caro',
    ],
  },
  {
    name: 'Putumayo',
    cities: [
      'Mocoa', 'Puerto Asís', 'Valle del Guamuez', 'Puerto Caicedo', 'Orito',
      'Villagarzón', 'Sibundoy', 'San Francisco', 'Santiago', 'Colón', 'San Miguel',
      'Puerto Leguízamo', 'Puerto Guzmán',
    ],
  },
  {
    name: 'Quindío',
    cities: [
      'Armenia', 'Calarcá', 'La Tebaida', 'Montenegro', 'Quimbaya', 'Circasia', 'Salento',
      'Filandia', 'Génova', 'Pijao', 'Córdoba', 'Buenavista',
    ],
  },
  {
    name: 'Risaralda',
    cities: [
      'Pereira', 'Dosquebradas', 'Santa Rosa de Cabal', 'La Virginia', 'Belén de Umbría',
      'Apía', 'Quinchía', 'Guática', 'Marsella', 'Mistrató', 'Pueblo Rico', 'Santuario',
      'Balboa', 'La Celia',
    ],
  },
  {
    name: 'San Andrés y Providencia',
    cities: ['San Andrés', 'Providencia', 'Santa Catalina'],
  },
  {
    name: 'Santander',
    cities: [
      'Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta', 'Barrancabermeja', 'San Gil',
      'Socorro', 'Barbosa', 'Málaga', 'Vélez', 'Cimitarra', 'Zapatoca', 'Puente Nacional',
      'Lebrija', 'Rionegro', 'Suaita', 'Curití', 'Simacota', 'Oiba', 'Aratoca',
      'Barichara', 'Cabrera', 'Charalá', 'Contratación', 'El Playón', 'Encino',
      'Florián', 'Galán', 'Gámbita', 'Guaca', 'Guadalupe', 'Guapotá', 'Guavatá',
      'Hato', 'Jesús María', 'La Belleza', 'Landázuri', 'La Paz', 'Matanza',
      'Mogotes', 'Molagavita', 'Ocamonte', 'Onzaga', 'Palmar', 'Palmas del Socorro',
      'Páramo', 'Pinchote', 'Puerto Parra', 'Puerto Wilches', 'Sabana de Torres',
      'San Andrés', 'San Benito', 'San Joaquín', 'San José de Miranda', 'San Miguel',
      'San Vicente de Chucurí', 'Santa Bárbara', 'Santa Helena del Opón', 'Suratá',
      'Tona', 'Valle de San José', 'Villanueva',
    ],
  },
  {
    name: 'Sucre',
    cities: [
      'Sincelejo', 'Corozal', 'Tolú', 'San Onofre', 'Sampués', 'Sincé', 'Morroa',
      'Coveñas', 'San Marcos', 'Ovejas', 'Galeras', 'Majagual', 'Los Palmitos',
      'Caimito', 'Chalán', 'Colosó', 'El Roble', 'Guaranda', 'La Unión', 'Palmito',
      'San Benito Abad', 'San Juan de Betulia', 'San Luis de Sincé', 'San Pedro',
      'Santiago de Tolú', 'Tolú Viejo', 'Buenavista',
    ],
  },
  {
    name: 'Tolima',
    cities: [
      'Ibagué', 'Espinal', 'Melgar', 'Honda', 'Mariquita', 'Chaparral', 'Líbano',
      'Fresno', 'Flandes', 'Purificación', 'Lérida', 'Guamo', 'Armero Guayabal',
      'Natagaima', 'Cajamarca', 'Ortega', 'Alpujarra', 'Alvarado', 'Ambalema',
      'Anzoátegui', 'Ataco', 'Carmen de Apicalá', 'Casabianca', 'Coello', 'Coyaima',
      'Cunday', 'Dolores', 'Falan', 'Herveo', 'Icononzo', 'Murillo', 'Palocabildo',
      'Piedras', 'Planadas', 'Prado', 'Rioblanco', 'Roncesvalles', 'Rovira',
      'Saldaña', 'San Antonio', 'San Luis', 'Santa Isabel', 'Suárez', 'Valle de San Juan',
      'Venadillo', 'Villahermosa', 'Villarrica',
    ],
  },
  {
    name: 'Valle del Cauca',
    cities: [
      'Cali', 'Buenaventura', 'Palmira', 'Tuluá', 'Cartago', 'Buga', 'Yumbo', 'Jamundí',
      'Florida', 'Candelaria', 'Pradera', 'Roldanillo', 'Zarzal', 'Sevilla', 'El Cerrito',
      'La Unión', 'Caicedonia', 'Dagua', 'Andalucía', 'Restrepo', 'Guacarí', 'Ginebra',
      'Alcalá', 'Ansermanuevo', 'Argelia', 'Bolívar', 'Bugalagrande', 'Calima - El Darién',
      'El Águila', 'El Cairo', 'El Dovio', 'La Cumbre', 'La Victoria', 'Obando',
      'Riofrío', 'San Pedro', 'Toro', 'Trujillo', 'Ulloa', 'Versalles', 'Vijes', 'Yotoco',
    ],
  },
  {
    name: 'Vaupés',
    cities: ['Mitú', 'Carurú', 'Taraira', 'Pacoa', 'Papunahua', 'Yavaraté'],
  },
  {
    name: 'Vichada',
    cities: ['Puerto Carreño', 'Cumaribo', 'La Primavera', 'Santa Rosalía'],
  },
];

export const COLOMBIA_DEPARTMENT_NAMES = COLOMBIA_DEPARTMENTS.map((d) => d.name);

export const getCitiesByDepartment = (departmentName: string): string[] => {
  const dept = COLOMBIA_DEPARTMENTS.find((d) => d.name === departmentName);
  return dept ? dept.cities : [];
};
