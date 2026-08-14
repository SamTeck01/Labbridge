// Biological Specimen definitions and high-fidelity optical canvas renderers

export interface CellStructureAnnotation {
  id: string;
  name: string;
  description: string;
  xPct: number; // 0 to 100 relative to specimen coordinate space
  yPct: number;
  minMagnification: number; // e.g. 10x or 40x
  optimalFocalDepth: number; // 0.0 to 1.0
}

export interface SpecimenData {
  id: string;
  title: string;
  scientificName: string;
  category: 'Plant Biology' | 'Human Histology' | 'Microbiology' | 'Protista';
  stainType: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  summary: string;
  keyStructures: string[];
  optimalFocus: number; // 0.0 to 1.0 (e.g. 0.52)
  focalTolerance: number; // how wide the sharp focal plane is
  baseMicronsWidth: number; // at 4x magnification, the field width in µm
  annotations: CellStructureAnnotation[];
  colorTheme: {
    background: string;
    primary: string;
    accent: string;
    border: string;
  };
}

export const SPECIMENS: SpecimenData[] = [
  {
    id: 'onion_epidermis',
    title: 'Onion Bulb Epidermal Cells',
    scientificName: 'Allium cepa',
    category: 'Plant Biology',
    stainType: 'Iodine Potassium Iodide (IKI) Stain',
    difficulty: 'Beginner',
    summary: 'Monolayer of plant epithelial cells demonstrating distinctive rigid cellulose cell walls, large central vacuoles, and stained spherical nuclei with nucleoli.',
    keyStructures: ['Cell Wall', 'Plasma Membrane', 'Nucleus', 'Nucleolus', 'Cytoplasmic Strands', 'Central Vacuole'],
    optimalFocus: 0.50,
    focalTolerance: 0.08,
    baseMicronsWidth: 2400,
    colorTheme: {
      background: '#fcf6e8',
      primary: '#9c6b28',
      accent: '#5a3811',
      border: '#d9a74a',
    },
    annotations: [
      {
        id: 'cell_wall_1',
        name: 'Cellulose Cell Wall',
        description: 'Rigid protective outer layer composed of cellulose fibers providing structural integrity and preventing osmotic lysis.',
        xPct: 52,
        yPct: 42,
        minMagnification: 4,
        optimalFocalDepth: 0.50,
      },
      {
        id: 'nucleus_1',
        name: 'Prominent Nucleus',
        description: 'Spherical genetic command center stained dark amber-brown by iodine binding to nucleoproteins and nucleic acids.',
        xPct: 48,
        yPct: 48,
        minMagnification: 10,
        optimalFocalDepth: 0.52,
      },
      {
        id: 'nucleolus_1',
        name: 'Dense Nucleolus',
        description: 'Dense sub-nuclear structure where ribosomal RNA (rRNA) transcription and ribosome assembly occurs.',
        xPct: 49.5,
        yPct: 49,
        minMagnification: 40,
        optimalFocalDepth: 0.52,
      },
      {
        id: 'cytoplasm_strands',
        name: 'Cytoplasmic Strands',
        description: 'Thin bridges of cytosol crossing between the central vacuole and cell periphery.',
        xPct: 62,
        yPct: 55,
        minMagnification: 40,
        optimalFocalDepth: 0.48,
      },
    ],
  },
  {
    id: 'human_blood',
    title: 'Human Blood Smear (Wright Stain)',
    scientificName: 'Homo sapiens (Peripheral blood)',
    category: 'Human Histology',
    stainType: "Wright-Giemsa Romanowsky Stain",
    difficulty: 'Intermediate',
    summary: 'Peripheral blood film revealing biconcave non-nucleated Erythrocytes (Red Blood Cells), multi-lobed Neutrophils (White Blood Cells), and small Thrombocyte platelets.',
    keyStructures: ['Erythrocytes (RBC)', 'Segmented Neutrophil', 'Lymphocyte', 'Blood Platelets', 'Central Pallor'],
    optimalFocus: 0.54,
    focalTolerance: 0.06,
    baseMicronsWidth: 2000,
    colorTheme: {
      background: '#faeff2',
      primary: '#c44569',
      accent: '#303952',
      border: '#e77f67',
    },
    annotations: [
      {
        id: 'rbc_cell',
        name: 'Erythrocyte (Red Blood Cell)',
        description: 'Biconcave disc (~7.5 µm diameter) lacking a nucleus to maximize hemoglobin volume for oxygen transport.',
        xPct: 42,
        yPct: 40,
        minMagnification: 10,
        optimalFocalDepth: 0.54,
      },
      {
        id: 'neutrophil_nucleus',
        name: 'Neutrophil Polymorphonuclear Nucleus',
        description: 'Multi-lobed nucleus connected by thin chromatin filaments in an active phagocytic leukocyte.',
        xPct: 53,
        yPct: 51,
        minMagnification: 40,
        optimalFocalDepth: 0.54,
      },
      {
        id: 'platelet_cluster',
        name: 'Thrombocytes (Platelets)',
        description: 'Small purple-stained cellular fragments (2-3 µm) essential for blood coagulation and clotting cascades.',
        xPct: 65,
        yPct: 35,
        minMagnification: 40,
        optimalFocalDepth: 0.53,
      },
    ],
  },
  {
    id: 'paramecium_protist',
    title: 'Paramecium Caudatum (Living Ciliate)',
    scientificName: 'Paramecium caudatum',
    category: 'Protista',
    stainType: 'Vital Methyl Green & Eosin',
    difficulty: 'Intermediate',
    summary: 'Single-celled slipper-shaped ciliated freshwater protozoan exhibiting coordinated ciliary beat, oral groove, food vacuoles, and contractile vacuoles.',
    keyStructures: ['Pellicle & Cilia', 'Macronucleus', 'Contractile Vacuole', 'Oral Groove / Cytostome', 'Food Vacuoles'],
    optimalFocus: 0.48,
    focalTolerance: 0.07,
    baseMicronsWidth: 1800,
    colorTheme: {
      background: '#eef8f6',
      primary: '#0984e3',
      accent: '#00b894',
      border: '#74b9ff',
    },
    annotations: [
      {
        id: 'cilia_fringe',
        name: 'Cilia Fringe',
        description: 'Thousands of hair-like microtubule projections beating rhythmically to propel the organism through aquatic medium.',
        xPct: 32,
        yPct: 50,
        minMagnification: 40,
        optimalFocalDepth: 0.48,
      },
      {
        id: 'macronucleus',
        name: 'Large Macronucleus',
        description: 'Polyploid kidney-shaped nucleus regulating everyday metabolic activities and gene transcription.',
        xPct: 48,
        yPct: 50,
        minMagnification: 10,
        optimalFocalDepth: 0.48,
      },
      {
        id: 'contractile_vacuole',
        name: 'Contractile Vacuole (Osmoregulation)',
        description: 'Star-shaped radial canals filling with excess intracellular water and periodically contracting to pump it out.',
        xPct: 62,
        yPct: 36,
        minMagnification: 40,
        optimalFocalDepth: 0.50,
      },
    ],
  },
  {
    id: 'elodea_chloroplasts',
    title: 'Elodea Leaf Chloroplasts',
    scientificName: 'Elodea canadensis',
    category: 'Plant Biology',
    stainType: 'Wet Mount (Unstained Live)',
    difficulty: 'Beginner',
    summary: 'Fresh aquatic leaf cells showing vibrant green discoid chloroplasts circulating along the periphery in cytoplasmic streaming (cyclosis).',
    keyStructures: ['Chloroplasts', 'Thylakoid Granules', 'Cytoplasmic Streaming (Cyclosis)', 'Cell Wall Matrix'],
    optimalFocus: 0.51,
    focalTolerance: 0.09,
    baseMicronsWidth: 2200,
    colorTheme: {
      background: '#eef9ee',
      primary: '#27ae60',
      accent: '#1e824c',
      border: '#2ecc71',
    },
    annotations: [
      {
        id: 'chloroplast_disc',
        name: 'Discoid Chloroplast',
        description: 'Double-membrane photosynthetic organelles containing chlorophyll pigments converting solar energy into sugars.',
        xPct: 46,
        yPct: 44,
        minMagnification: 10,
        optimalFocalDepth: 0.51,
      },
      {
        id: 'plant_cell_wall',
        name: 'Primary Cellulose Wall',
        description: 'Rigid pectin-cemented boundary separating adjoining photosynthetic palisade cells.',
        xPct: 55,
        yPct: 38,
        minMagnification: 4,
        optimalFocalDepth: 0.51,
      },
    ],
  },
  {
    id: 'bacillus_bacteria',
    title: 'Gram-Positive Bacteria Culture',
    scientificName: 'Bacillus subtilis',
    category: 'Microbiology',
    stainType: 'Gram Stain (Crystal Violet / Safranin)',
    difficulty: 'Advanced',
    summary: 'Rod-shaped Gram-positive bacteria exhibiting thick peptidoglycan cell walls retaining the crystal violet-iodine complex (deep violet purple).',
    keyStructures: ['Bacillus Rods', 'Peptidoglycan Cell Wall', 'Endospore Formation', 'Bacterial Chains'],
    optimalFocus: 0.55,
    focalTolerance: 0.04,
    baseMicronsWidth: 1200,
    colorTheme: {
      background: '#f3eef8',
      primary: '#5f27cd',
      accent: '#341f97',
      border: '#a29bfe',
    },
    annotations: [
      {
        id: 'gram_positive_rod',
        name: 'Gram-Positive Bacillus Rod',
        description: 'Individual 1-3 µm cylindrical bacterium with dense multilayered peptidoglycan wall stained dark violet.',
        xPct: 50,
        yPct: 48,
        minMagnification: 40,
        optimalFocalDepth: 0.55,
      },
      {
        id: 'streptobacillus_chain',
        name: 'Streptobacillus Chain',
        description: 'Filamentous chain of dividing bacterial cells end-to-end following binary fission.',
        xPct: 38,
        yPct: 58,
        minMagnification: 40,
        optimalFocalDepth: 0.55,
      },
    ],
  },
];

export interface ObjectiveLens {
  power: number; // 4, 10, 40, 100
  totalMagnification: number; // 40x, 100x, 400x, 1000x (with 10x ocular)
  name: string;
  ringColor: string;
  numericalAperture: number;
  workingDistanceMm: number;
  fieldDiameterUm: number;
}

export const OBJECTIVE_LENSES: ObjectiveLens[] = [
  {
    power: 4,
    totalMagnification: 40,
    name: 'Scanning (4x)',
    ringColor: '#e74c3c', // Red ring
    numericalAperture: 0.10,
    workingDistanceMm: 18.0,
    fieldDiameterUm: 4500,
  },
  {
    power: 10,
    totalMagnification: 100,
    name: 'Low Power (10x)',
    ringColor: '#f39c12', // Yellow ring
    numericalAperture: 0.25,
    workingDistanceMm: 7.0,
    fieldDiameterUm: 1800,
  },
  {
    power: 40,
    totalMagnification: 400,
    name: 'High Power (40x)',
    ringColor: '#2980b9', // Blue ring
    numericalAperture: 0.65,
    workingDistanceMm: 0.6,
    fieldDiameterUm: 450,
  },
  {
    power: 100,
    totalMagnification: 1000,
    name: 'Oil Immersion (100x)',
    ringColor: '#ecf0f1', // White/Silver ring
    numericalAperture: 1.25,
    workingDistanceMm: 0.15,
    fieldDiameterUm: 180,
  },
];
