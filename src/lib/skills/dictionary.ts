// Skills dictionary used to detect skills in resume text (REQ-031) and,
// later, in job requirements (REQ-040). Each entry has one display name and
// the spellings people actually write.
//
// `aliases` are matched case-insensitively.
// `exact` are matched case-sensitively — for short names that are also
// ordinary words or letters ("Go", "C", "R"), so "go to" or "grade c" don't count.

export type SkillEntry = {
  name: string;
  aliases: string[];
  exact?: string[];
};

export const SKILLS: SkillEntry[] = [
  // Languages
  { name: "JavaScript", aliases: ["javascript", "js", "ecmascript", "es6"] },
  { name: "TypeScript", aliases: ["typescript", "ts"] },
  { name: "Python", aliases: ["python", "python3"] },
  { name: "Java", aliases: ["java"] },
  { name: "C", aliases: ["c language", "c programming", "ansi c"], exact: ["C"] },
  { name: "C++", aliases: ["c++", "cpp"] },
  { name: "C#", aliases: ["c#", "csharp", "c sharp"] },
  { name: "Go", aliases: ["golang"], exact: ["Go"] },
  { name: "Rust", aliases: ["rust"] },
  { name: "Kotlin", aliases: ["kotlin"] },
  { name: "Swift", aliases: ["swift"] },
  { name: "Dart", aliases: ["dart"] },
  { name: "PHP", aliases: ["php"] },
  { name: "Ruby", aliases: ["ruby"] },
  { name: "R", aliases: [], exact: ["R"] },
  { name: "SQL", aliases: ["sql"] },
  { name: "HTML", aliases: ["html", "html5"] },
  { name: "CSS", aliases: ["css", "css3"] },
  { name: "Bash", aliases: ["bash", "shell scripting"] },

  // Frontend
  { name: "React", aliases: ["react", "react.js", "reactjs"] },
  { name: "Next.js", aliases: ["next.js", "nextjs"] },
  { name: "Vue", aliases: ["vue", "vue.js", "vuejs"] },
  { name: "Angular", aliases: ["angular", "angularjs"] },
  { name: "Svelte", aliases: ["svelte", "sveltekit"] },
  { name: "Redux", aliases: ["redux"] },
  { name: "Tailwind CSS", aliases: ["tailwind", "tailwindcss", "tailwind css"] },
  { name: "Bootstrap", aliases: ["bootstrap"] },
  { name: "jQuery", aliases: ["jquery"] },

  // Backend
  { name: "Node.js", aliases: ["node", "node.js", "nodejs"] },
  { name: "Express", aliases: ["express", "express.js", "expressjs"] },
  { name: "NestJS", aliases: ["nestjs", "nest.js"] },
  { name: "Django", aliases: ["django"] },
  { name: "Flask", aliases: ["flask"] },
  { name: "FastAPI", aliases: ["fastapi"] },
  { name: "Spring Boot", aliases: ["spring boot", "springboot", "spring"] },
  { name: ".NET", aliases: [".net", "dotnet", "asp.net", ".net core"] },
  { name: "Laravel", aliases: ["laravel"] },
  { name: "GraphQL", aliases: ["graphql"] },
  { name: "REST APIs", aliases: ["rest", "rest api", "rest apis", "restful"] },

  // Mobile
  { name: "Flutter", aliases: ["flutter"] },
  { name: "React Native", aliases: ["react native", "react-native"] },
  { name: "Android", aliases: ["android"] },
  { name: "iOS", aliases: ["ios"] },

  // Databases
  { name: "MySQL", aliases: ["mysql"] },
  { name: "PostgreSQL", aliases: ["postgresql", "postgres"] },
  { name: "SQLite", aliases: ["sqlite"] },
  { name: "MongoDB", aliases: ["mongodb", "mongo"] },
  { name: "Redis", aliases: ["redis"] },
  { name: "Firebase", aliases: ["firebase"] },
  { name: "SQL Server", aliases: ["sql server", "mssql"] },
  { name: "Oracle", aliases: ["oracle"] },

  // Cloud & DevOps
  { name: "AWS", aliases: ["aws", "amazon web services"] },
  { name: "Azure", aliases: ["azure"] },
  { name: "Google Cloud", aliases: ["gcp", "google cloud"] },
  { name: "Docker", aliases: ["docker"] },
  { name: "Kubernetes", aliases: ["kubernetes", "k8s"] },
  { name: "Linux", aliases: ["linux", "ubuntu"] },
  { name: "CI/CD", aliases: ["ci/cd", "cicd", "github actions", "jenkins", "gitlab ci"] },
  { name: "Git", aliases: ["git", "github", "gitlab"] },

  // Data & AI
  { name: "Machine Learning", aliases: ["machine learning", "ml"] },
  { name: "Deep Learning", aliases: ["deep learning"] },
  { name: "TensorFlow", aliases: ["tensorflow"] },
  { name: "PyTorch", aliases: ["pytorch"] },
  { name: "scikit-learn", aliases: ["scikit-learn", "sklearn", "scikit learn"] },
  { name: "Pandas", aliases: ["pandas"] },
  { name: "NumPy", aliases: ["numpy"] },
  { name: "Power BI", aliases: ["power bi", "powerbi"] },
  { name: "Data Analysis", aliases: ["data analysis", "data analytics"] },
  { name: "NLP", aliases: ["nlp", "natural language processing"] },
  { name: "LLMs", aliases: ["llm", "llms", "large language models", "generative ai", "genai"] },

  // Testing & QA
  { name: "Unit Testing", aliases: ["unit testing", "unit tests", "jest", "vitest", "pytest", "junit"] },
  { name: "Selenium", aliases: ["selenium"] },
  { name: "Cypress", aliases: ["cypress"] },
  { name: "Playwright", aliases: ["playwright"] },
  { name: "Manual QA", aliases: ["manual testing", "quality assurance", "sqa"] },

  // Security & networking
  { name: "OWASP", aliases: ["owasp"] },
  { name: "Cybersecurity", aliases: ["cybersecurity", "cyber security", "information security", "infosec"] },
  { name: "Networking", aliases: ["networking", "tcp/ip", "ccna"] },

  // Concepts & tools
  { name: "OOP", aliases: ["oop", "object oriented programming", "object-oriented programming"] },
  { name: "Data Structures & Algorithms", aliases: ["data structures", "algorithms", "dsa"] },
  { name: "Agile", aliases: ["agile", "scrum", "jira"] },
  { name: "Figma", aliases: ["figma"] },
  { name: "UI/UX", aliases: ["ui/ux", "ux design", "ui design", "user experience"] },
  { name: "WordPress", aliases: ["wordpress"] },
  { name: "Shopify", aliases: ["shopify"] },
];
