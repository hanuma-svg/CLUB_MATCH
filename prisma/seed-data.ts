import type { ClubCategory, InterestCategory } from "@prisma/client";

export interface SeedInterest {
  name: string;
  category: InterestCategory;
  description: string;
  iconName: string;
}

export interface SeedClub {
  name: string;
  category: ClubCategory;
  tagline: string;
  description: string;
  activities: string;
  isFeatured?: boolean;
  interestNames: string[];
}

export interface SeedEventCategory {
  name: string;
  description: string;
}

export const SEED_INTERESTS: SeedInterest[] = [
  // Technology
  { name: "Coding and Programming", category: "TECHNOLOGY", description: "Competitive programming, algorithms, and software engineering.", iconName: "Code2" },
  { name: "Artificial Intelligence", category: "TECHNOLOGY", description: "Intelligent agents, reasoning, NLP, and generative AI.", iconName: "BrainCircuit" },
  { name: "Machine Learning", category: "TECHNOLOGY", description: "Neural networks, deep learning, and predictive modeling.", iconName: "Cpu" },
  { name: "Web Development", category: "TECHNOLOGY", description: "Frontend frameworks, APIs, cloud deployment, and full-stack apps.", iconName: "Globe" },
  { name: "App Development", category: "TECHNOLOGY", description: "Cross-platform mobile apps, Android, and iOS engineering.", iconName: "Smartphone" },
  { name: "Cybersecurity", category: "TECHNOLOGY", description: "Capture The Flag, network defense, cryptography, and AppSec.", iconName: "ShieldCheck" },
  { name: "Robotics", category: "TECHNOLOGY", description: "Embedded systems, autonomous bots, hardware, and sensors.", iconName: "Bot" },
  { name: "Data Science", category: "TECHNOLOGY", description: "Data analytics, visualization, statistics, and big data.", iconName: "BarChart3" },

  // Creative
  { name: "Graphic Design", category: "CREATIVE", description: "Visual identity, typography, UI/UX, and poster design.", iconName: "Palette" },
  { name: "Photography", category: "CREATIVE", description: "Campus photo walks, portraits, event coverage, and editing.", iconName: "Camera" },
  { name: "Video Editing", category: "CREATIVE", description: "Motion graphics, color grading, and post-production.", iconName: "Film" },
  { name: "Filmmaking", category: "CREATIVE", description: "Short films, scriptwriting, cinematography, and direction.", iconName: "Clapperboard" },
  { name: "Digital Art", category: "CREATIVE", description: "Illustration, 3D modeling, concept art, and creative coding.", iconName: "Brush" },

  // Cultural
  { name: "Music", category: "CULTURAL", description: "Instrumental ensembles, acoustic jams, and live performances.", iconName: "Music" },
  { name: "Singing", category: "CULTURAL", description: "Classical, western, choir, and solo vocal performances.", iconName: "Mic" },
  { name: "Dance", category: "CULTURAL", description: "Classical, contemporary, hip-hop, and stage choreography.", iconName: "Sparkles" },
  { name: "Drama", category: "CULTURAL", description: "Stage plays, street theatre, improv, and acting.", iconName: "Theater" },
  { name: "Literature", category: "CULTURAL", description: "Creative writing, poetry, book clubs, and editorial work.", iconName: "BookOpen" },
  { name: "Debating", category: "CULTURAL", description: "Parliamentary debate, Model UN, and structured argumentation.", iconName: "MessageSquareQuote" },

  // Other
  { name: "Entrepreneurship", category: "OTHER", description: "Startups, pitch decks, product thinking, and venture building.", iconName: "Rocket" },
  { name: "Sports", category: "OTHER", description: "Campus athletics, motorsport engineering, and team competitions.", iconName: "Trophy" },
  { name: "Social Service", category: "OTHER", description: "Community outreach, volunteering, and sustainability drives.", iconName: "HeartHandshake" },
  { name: "Public Speaking", category: "OTHER", description: "Stage hosting, oratory, workshops, and leadership talks.", iconName: "Megaphone" },
  { name: "Quizzing", category: "OTHER", description: "General knowledge, tech trivia, and inter-college quiz bowls.", iconName: "HelpCircle" },
  { name: "Research", category: "OTHER", description: "Academic papers, lab experiments, patents, and R&D projects.", iconName: "Microscope" },
];

export const SEED_EVENT_CATEGORIES: SeedEventCategory[] = [
  { name: "Technical", description: "Deep-dive coding, systems, and engineering sessions." },
  { name: "Workshops", description: "Hands-on guided learning and skill-building bootcamps." },
  { name: "Hackathons", description: "24-hour to 48-hour collaborative build sprints." },
  { name: "Cultural", description: "Music, dance, drama, literature, and campus showcases." },
  { name: "Sports", description: "Athletic, motorsport, and team-spirit campus activities." },
  { name: "Entrepreneurship", description: "Pitch events, founder talks, and startup ideathons." },
  { name: "Seminars", description: "Research talks, industry panels, and faculty colloquiums." },
  { name: "Competitions", description: "Quizzes, debates, CTFs, and inter-campus contests." },
];

// Reference: https://pesufy.netlify.app/docs/ec-campus/clubs/
// All descriptions & activities below are explicitly flagged isSampleDescription=true
// with verifiedCoordinatorName=null, verifiedEmail=null, verifiedSocialLinks=null.
export const SEED_CLUBS: SeedClub[] = [
  // A. TECHNICAL CLUBS (15)
  {
    name: "HSP (formerly HackerSpace)",
    category: "TECHNICAL",
    tagline: "Sample: Open-source builder & hacker collective at PESU ECC",
    description:
      "Sample description: A student technical community focused on open-source engineering, Linux, systems programming, and peer-led maker sprints. Verify official details with PESU EC Campus student affairs.",
    activities: "Sample activities: Open-source sprints, Linux install fests, systems workshops, and project showcases.",
    isFeatured: true,
    interestNames: ["Coding and Programming", "Web Development", "Cybersecurity"],
  },
  {
    name: "CodeChef PESU ECC",
    category: "TECHNICAL",
    tagline: "Sample: Competitive programming & algorithmic problem solving",
    description:
      "Sample description: A competitive coding chapter encouraging algorithmic thinking, data structures mastery, and ICPC-style team contests. Verify official details with PESU EC Campus.",
    activities: "Sample activities: Weekly rated mock contests, DSA bootcamps, and inter-campus coding leagues.",
    isFeatured: true,
    interestNames: ["Coding and Programming", "Data Science"],
  },
  {
    name: "Google Developer Student Club",
    category: "TECHNICAL",
    tagline: "Sample: Peer-to-peer developer community exploring web, mobile & cloud",
    description:
      "Sample description: A campus developer group focused on building real-world solutions using web, Android, cloud, and AI developer tools. Verify official details with PESU EC Campus.",
    activities: "Sample activities: Solution Challenge prep, Android & Flutter study jams, and cloud labs.",
    isFeatured: true,
    interestNames: ["Web Development", "App Development", "Artificial Intelligence"],
  },
  {
    name: "ACM PESU ECC Student Chapter",
    category: "TECHNICAL",
    tagline: "Sample: Computing machinery student chapter & technical talks",
    description:
      "Sample description: A student chapter dedicated to advancing computing as a science and profession through technical seminars and coding events. Verify official details with PESU EC Campus.",
    activities: "Sample activities: Computing colloquiums, research reading groups, and technical hackathons.",
    interestNames: ["Coding and Programming", "Artificial Intelligence", "Research"],
  },
  {
    name: "IEEE PESU ECC Student Branch",
    category: "TECHNICAL",
    tagline: "Sample: Electrical, electronics & computing professional student branch",
    description:
      "Sample description: A multidisciplinary technical branch connecting engineering students with IEEE technical societies, conferences, and hardware-software projects. Verify official details with PESU EC Campus.",
    activities: "Sample activities: Paper presentation mentorship, technical symposiums, and IEEE day events.",
    interestNames: ["Robotics", "Research", "Coding and Programming"],
  },
  {
    name: "IEEE RAS PESU ECC",
    category: "TECHNICAL",
    tagline: "Sample: Robotics & Automation Society student chapter",
    description:
      "Sample description: Focused on autonomous robots, embedded control, ROS, sensors, and mechatronics prototyping. Verify official details with PESU EC Campus.",
    activities: "Sample activities: Line-follower and sumo bot builds, Arduino/ROS workshops, and robowars.",
    isFeatured: true,
    interestNames: ["Robotics", "Artificial Intelligence"],
  },
  {
    name: "Layer8",
    category: "TECHNICAL",
    tagline: "Sample: Cybersecurity & ethical hacking student community",
    description:
      "Sample description: A cybersecurity community exploring Capture The Flag (CTF) challenges, network security, reverse engineering, and secure coding. Verify official details with PESU EC Campus.",
    activities: "Sample activities: CTF competitions, vulnerability labs, Linux hardening, and security briefings.",
    isFeatured: true,
    interestNames: ["Cybersecurity", "Coding and Programming"],
  },
  {
    name: "Silicon",
    category: "TECHNICAL",
    tagline: "Sample: Hardware, VLSI & digital electronics enthusiast club",
    description:
      "Sample description: A technical group centered around semiconductor design, embedded hardware, FPGA prototyping, and circuit systems. Verify official details with PESU EC Campus.",
    activities: "Sample activities: PCB design sessions, Verilog/FPGA labs, and hardware hackathons.",
    interestNames: ["Robotics", "Research"],
  },
  {
    name: "Parallax",
    category: "TECHNICAL",
    tagline: "Sample: AR/VR, computer graphics & interactive tech club",
    description:
      "Sample description: A creative-tech community exploring game engines, spatial computing, shaders, and immersive 3D experiences. Verify official details with PESU EC Campus.",
    activities: "Sample activities: Game jams, Unity/Unreal workshops, and 3D interactive demos.",
    interestNames: ["Digital Art", "App Development", "Web Development"],
  },
  {
    name: "NeuralHive",
    category: "TECHNICAL",
    tagline: "Sample: Artificial Intelligence & Machine Learning collective",
    description:
      "Sample description: A student AI/ML community focusing on deep learning, generative models, data pipelines, and applied machine learning projects. Verify official details with PESU EC Campus.",
    activities: "Sample activities: ML paper jams, Kaggle sprints, and neural network workshops.",
    isFeatured: true,
    interestNames: ["Artificial Intelligence", "Machine Learning", "Data Science"],
  },
  {
    name: "MLSA",
    category: "TECHNICAL",
    tagline: "Sample: Microsoft Learn Student Ambassadors campus community",
    description:
      "Sample description: Student ambassadors hosting hands-on workshops on cloud computing, TypeScript, DevOps, and modern AI tooling. Verify official details with PESU EC Campus.",
    activities: "Sample activities: Cloud architecture labs, Git/GitHub bootcamps, and developer meetups.",
    interestNames: ["Web Development", "Artificial Intelligence", "Data Science"],
  },
  {
    name: "Nexus",
    category: "TECHNICAL",
    tagline: "Sample: Cloud computing & AWS student builders club",
    description:
      "Sample description: A student community focused on cloud-native architecture, serverless backends, containers, and distributed infrastructure. Verify official details with PESU EC Campus.",
    activities: "Sample activities: Cloud certification study groups, architecture jams, and deployment clinics.",
    interestNames: ["Web Development", "Cybersecurity", "Data Science"],
  },
  {
    name: "Shunya",
    category: "TECHNICAL",
    tagline: "Sample: Mathematics & quantitative reasoning club",
    description:
      "Sample description: A campus math community exploring discrete mathematics, probability, cryptography puzzles, and algorithmic proofs. Verify official details with PESU EC Campus.",
    activities: "Sample activities: Math olympiad prep, puzzle hunts, and quantitative modeling talks.",
    interestNames: ["Data Science", "Research", "Quizzing"],
  },
  {
    name: "WEAL",
    category: "TECHNICAL",
    tagline: "Sample: Mental health in tech & inclusive engineering community",
    description:
      "Sample description: A supportive tech community promoting wellbeing, sustainable engineering habits, and inclusive peer mentorship on campus. Verify official details with PESU EC Campus.",
    activities: "Sample activities: Peer circles, tech-life balance panels, and community outreach.",
    interestNames: ["Social Service", "Public Speaking", "Web Development"],
  },
  {
    name: "Team Vegavath Racing",
    category: "TECHNICAL",
    tagline: "Sample: Student motorsport & formula vehicle engineering team",
    description:
      "Sample description: A multidisciplinary engineering team designing, fabricating, and racing student formula vehicles. Verify official details with PESU EC Campus.",
    activities: "Sample activities: Chassis CAD modeling, powertrain testing, and motorsport competitions.",
    interestNames: ["Robotics", "Sports", "Research"],
  },

  // B. NON-TECHNICAL CLUBS (8)
  {
    name: "The Entrepreneurship Club",
    category: "NON_TECHNICAL",
    tagline: "Sample: Startup founders, venture ideation & business strategy",
    description:
      "Sample description: Fosters entrepreneurial mindset on campus through startup ideation, product validation, and founder mentorship. Verify official details with PESU EC Campus.",
    activities: "Sample activities: Pitch competitions, founder fireside chats, and startup weekends.",
    isFeatured: true,
    interestNames: ["Entrepreneurship", "Public Speaking"],
  },
  {
    name: "Pixelloid",
    category: "NON_TECHNICAL",
    tagline: "Sample: Campus photography & visual storytelling club",
    description:
      "Sample description: Brings together campus photographers and visual storytellers covering events, portraits, and photo essays. Verify official details with PESU EC Campus.",
    activities: "Sample activities: Campus photo walks, Lightroom editing workshops, and photo exhibitions.",
    interestNames: ["Photography", "Video Editing", "Filmmaking"],
  },
  {
    name: "DSGNR",
    category: "NON_TECHNICAL",
    tagline: "Sample: UI/UX, graphic design & visual branding collective",
    description:
      "Sample description: A design community focused on typography, product interfaces, brand systems, and digital illustration. Verify official details with PESU EC Campus.",
    activities: "Sample activities: Figma designathons, portfolio critiques, and poster design sprints.",
    isFeatured: true,
    interestNames: ["Graphic Design", "Digital Art", "Web Development"],
  },
  {
    name: "Quotient Quiz Club",
    category: "NON_TECHNICAL",
    tagline: "Sample: Campus quizzing & trivia society",
    description:
      "Sample description: Hosts regular quizzing sessions spanning science, pop culture, history, business, and current affairs. Verify official details with PESU EC Campus.",
    activities: "Sample activities: Weekly intra-campus quizzes, themed trivia nights, and inter-college quiz fests.",
    interestNames: ["Quizzing", "Literature"],
  },
  {
    name: "MUNSOC PESU ECC",
    category: "NON_TECHNICAL",
    tagline: "Sample: Model United Nations & global diplomacy society",
    description:
      "Sample description: Trains delegates in international relations, policy drafting, negotiation, and formal committee debate. Verify official details with PESU EC Campus.",
    activities: "Sample activities: Mock MUN committees, diplomatic resolution workshops, and annual conferences.",
    interestNames: ["Debating", "Public Speaking"],
  },
  {
    name: "DebSocECC",
    category: "NON_TECHNICAL",
    tagline: "Sample: Parliamentary debating & critical speaking club",
    description:
      "Sample description: A debating society practicing British and Asian Parliamentary formats, rhetoric, and persuasive argumentation. Verify official details with PESU EC Campus.",
    activities: "Sample activities: Weekly spar debates, novices workshops, and national debate tournaments.",
    interestNames: ["Debating", "Public Speaking", "Literature"],
  },
  {
    name: "Apostrophe",
    category: "NON_TECHNICAL",
    tagline: "Sample: Literary, creative writing & campus editorial club",
    description:
      "Sample description: A haven for writers, poets, journalists, and readers sharing stories, zines, and literary discussions. Verify official details with PESU EC Campus.",
    activities: "Sample activities: Open-mic poetry, creative writing prompts, and campus magazine curation.",
    interestNames: ["Literature", "Public Speaking"],
  },
  {
    name: "Rotaract Club",
    category: "NON_TECHNICAL",
    tagline: "Sample: Youth leadership & community social service club",
    description:
      "Sample description: Organizes civic engagement drives, blood donation camps, teaching outreach, and sustainability initiatives. Verify official details with PESU EC Campus.",
    activities: "Sample activities: Community volunteering, charity drives, and environmental cleanups.",
    interestNames: ["Social Service", "Public Speaking", "Entrepreneurship"],
  },

  // C. CULTURAL CLUBS (9)
  {
    name: "Kannada Koota",
    category: "CULTURAL",
    tagline: "Sample: Kannada language, heritage & cultural celebration club",
    description:
      "Sample description: Celebrates Karnataka's literature, theatre, folk arts, and regional festivals on the EC campus. Verify official details with PESU EC Campus.",
    activities: "Sample activities: Rajyotsava celebrations, Kannada cultural nights, and literary contests.",
    interestNames: ["Literature", "Drama", "Music"],
  },
  {
    name: "Panache",
    category: "CULTURAL",
    tagline: "Sample: Fashion, styling & stage walk collective",
    description:
      "Sample description: A creative fashion and runway team designing themed collections, choreography, and stage production. Verify official details with PESU EC Campus.",
    activities: "Sample activities: Fashion walk rehearsals, costume styling workshops, and fest showcases.",
    interestNames: ["Dance", "Graphic Design"],
  },
  {
    name: "Terpsichore",
    category: "CULTURAL",
    tagline: "Sample: Contemporary, classical & western campus dance crew",
    description:
      "Sample description: A high-energy dance community practicing choreography across street, contemporary, and classical styles. Verify official details with PESU EC Campus.",
    activities: "Sample activities: Choreography cyphers, dance battles, and cultural fest productions.",
    isFeatured: true,
    interestNames: ["Dance", "Music"],
  },
  {
    name: "Swarantraka",
    category: "CULTURAL",
    tagline: "Sample: Indian classical & fusion music society",
    description:
      "Sample description: Dedicated to vocal and instrumental Indian classical, semi-classical, and acoustic fusion ensembles. Verify official details with PESU EC Campus.",
    activities: "Sample activities: Acoustic baithaks, classical vocal jams, and fest stage sets.",
    interestNames: ["Music", "Singing"],
  },
  {
    name: "The MangoBites",
    category: "CULTURAL",
    tagline: "Sample: Campus theatre, street play & dramatics team",
    description:
      "Sample description: A dramatics club staging proscenium plays, nukkad nataks, improv comedy, and script workshops. Verify official details with PESU EC Campus.",
    activities: "Sample activities: Improv nights, street theatre productions, and acting bootcamps.",
    interestNames: ["Drama", "Public Speaking", "Filmmaking"],
  },
  {
    name: "Tonic And A 9th",
    category: "CULTURAL",
    tagline: "Sample: Western music, bands & instrumental collective",
    description:
      "Sample description: A campus band and contemporary music club spanning rock, indie, jazz, and original songwriting. Verify official details with PESU EC Campus.",
    activities: "Sample activities: Band jam sessions, battle-of-the-bands prep, and campus concerts.",
    interestNames: ["Music", "Singing"],
  },
  {
    name: "Nirantara",
    category: "CULTURAL",
    tagline: "Sample: Folk, heritage & performing arts collective",
    description:
      "Sample description: Preserves and performs traditional dance, music, and cultural storytelling showcases. Verify official details with PESU EC Campus.",
    activities: "Sample activities: Traditional ensemble rehearsals and cultural festival performances.",
    interestNames: ["Dance", "Music", "Drama"],
  },
  {
    name: "The Hashtag Crew",
    category: "CULTURAL",
    tagline: "Sample: Hip-hop, street dance & urban choreography crew",
    description:
      "Sample description: An urban dance crew focused on hip-hop, popping, locking, and high-impact stage performances. Verify official details with PESU EC Campus.",
    activities: "Sample activities: Freestyle cyphers, crew showcases, and inter-college dance competitions.",
    interestNames: ["Dance", "Video Editing"],
  },
  {
    name: "The Clefhangers",
    category: "CULTURAL",
    tagline: "Sample: Acapella, choir & vocal harmony ensemble",
    description:
      "Sample description: A vocal harmony group arranging contemporary and classic tracks for live acapella and choir sets. Verify official details with PESU EC Campus.",
    activities: "Sample activities: Vocal harmony rehearsals, campus unplugged evenings, and fest concerts.",
    interestNames: ["Singing", "Music"],
  },

  // D. RESEARCH CENTERS (9) — Distinctly categorized as RESEARCH_CENTER
  {
    name: "C3I",
    category: "RESEARCH_CENTER",
    tagline: "Sample: Centre of Cognitive Computing and Computational Intelligence",
    description:
      "Sample description (Research Center): Academic research lab focusing on Natural Language Processing, Neural Networks, and Social Computing. Verify official lab onboarding with PESU EC Campus.",
    activities: "Sample activities: Undergraduate research internships, NLP paper reading groups, and prototype labs.",
    isFeatured: true,
    interestNames: ["Artificial Intelligence", "Machine Learning", "Research"],
  },
  {
    name: "CCNCS",
    category: "RESEARCH_CENTER",
    tagline: "Sample: Center for Computer Networks and Cyber Security",
    description:
      "Sample description (Research Center): Dedicated to network protocol security, intrusion detection, and cyber defense research. Verify official lab onboarding with PESU EC Campus.",
    activities: "Sample activities: Security testbed experiments, packet analysis projects, and research publications.",
    interestNames: ["Cybersecurity", "Research"],
  },
  {
    name: "CoDMAV",
    category: "RESEARCH_CENTER",
    tagline: "Sample: Centre of Data Modelling, Analytics and Visualization",
    description:
      "Sample description (Research Center): Explores statistical modeling, big-data pipelines, and interactive visual analytics. Verify official lab onboarding with PESU EC Campus.",
    activities: "Sample activities: Data modeling sprints, visual analytics case studies, and capstone mentoring.",
    interestNames: ["Data Science", "Machine Learning", "Research"],
  },
  {
    name: "CHIPS",
    category: "RESEARCH_CENTER",
    tagline: "Sample: Centre for Heterogeneous and Intelligent Processing Systems",
    description:
      "Sample description (Research Center): Focuses on GPU acceleration, heterogeneous architectures, and edge AI compute systems. Verify official lab onboarding with PESU EC Campus.",
    activities: "Sample activities: Parallel computing benchmarks, hardware-software co-design, and lab seminars.",
    interestNames: ["Artificial Intelligence", "Coding and Programming", "Research"],
  },
  {
    name: "PESURF",
    category: "RESEARCH_CENTER",
    tagline: "Sample: PES University Research Foundation",
    description:
      "Sample description (Research Center): Supports funded AI/ML research, industry collaboration, and interdisciplinary student innovation. Verify official lab onboarding with PESU EC Campus.",
    activities: "Sample activities: Industry-sponsored R&D projects, grant workshops, and patent clinics.",
    interestNames: ["Research", "Artificial Intelligence", "Entrepreneurship"],
  },
  {
    name: "CONECT",
    category: "RESEARCH_CENTER",
    tagline: "Sample: Center Of Networking and Evolving Communication Technologies",
    description:
      "Sample description (Research Center): Researches next-gen wireless networks, hardware communication systems, and IoT protocols. Verify official lab onboarding with PESU EC Campus.",
    activities: "Sample activities: RF/wireless simulation labs and embedded networking prototypes.",
    interestNames: ["Robotics", "Cybersecurity", "Research"],
  },
  {
    name: "IOT Maker's Space",
    category: "RESEARCH_CENTER",
    tagline: "Sample: Interfacing software, hardware, PCBs & sensor prototyping lab",
    description:
      "Sample description (Research Center): Hands-on hardware innovation space for embedded controllers, custom PCBs, and sensor networks. Verify official lab onboarding with PESU EC Campus.",
    activities: "Sample activities: Sensor integration workshops, PCB milling, and smart-campus IoT demos.",
    interestNames: ["Robotics", "App Development", "Research"],
  },
  {
    name: "MedInn TechLabs",
    category: "RESEARCH_CENTER",
    tagline: "Sample: Bio-informatics and medical devices research lab",
    description:
      "Sample description (Research Center): Interdisciplinary healthcare technology lab working on bioinformatics and diagnostic devices. Verify official lab onboarding with PESU EC Campus.",
    activities: "Sample activities: Biomedical signal processing projects and healthcare prototype reviews.",
    interestNames: ["Data Science", "Artificial Intelligence", "Research"],
  },
  {
    name: "QuaNad Lab",
    category: "RESEARCH_CENTER",
    tagline: "Sample: Quantum and Nano Devices interdisciplinary research lab",
    description:
      "Sample description (Research Center): Interdisciplinary research team exploring quantum computing principles and nanoscale device simulation. Verify official lab onboarding with PESU EC Campus.",
    activities: "Sample activities: Quantum circuit simulations, literature colloquiums, and research seminars.",
    interestNames: ["Research", "Coding and Programming"],
  },
];
