## BE
mkdir backend

.prettierrc
{
  "semi": true,
  "singleQuote": false
}

tsconfig.json
{
  "compilerOptions": {
    "noEmit": false,
    "target": "esnext",
    "module": "nodenext",
    "rewriteRelativeImportExtensions": true,
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true,
    "allowImportingTsExtensions": true,
    "types": ["vitest/globals"],
    "moduleResolution": "nodenext",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true
  }
}

tsconfig.build.json
{
	"extends": "./tsconfig.json",
	"compilerOptions": {
		"noEmit": false,
		"outDir": "dist",
		"declaration": false,
		"sourceMap": false,
		"module": "NodeNext",
		"moduleResolution": "NodeNext",
		"skipLibCheck": true
	},
	"include": ["src/**/*", "env.ts"],
	"exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}


cd backend

npm init -y

npm install @epic-web/remember bcrypt cookie-parser cors custom-env dotenv drizzle-orm drizzle-zod express helmet i18next i18next-fs-backend jose jsonwebtoken morgan pg ts-node zod

npm install -D @types/bcrypt @types/cookie-parser @types/cors @types/express @types/jest @types/jsonwebtoken @types/morgan @types/node @types/supertest cross-env drizzle-kit nodemon supertest tsconfig-paths tsx typescript vitest

.env
DATABASE_URL

## FE
npm create vite@latest

select react, tanstack router

select with "Space" shadcn and tanstack query