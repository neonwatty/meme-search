interface HelloReactProps {
  name: string
}

export default function HelloReact({ name }: HelloReactProps) {
  return (
    <div className="p-4 bg-blue-100 rounded">
      <h2 className="text-xl font-bold">Hello from React!</h2>
      <p>Welcome, {name}</p>
      <p className="text-sm text-gray-600 mt-2">
        ✅ React is working!<br/>
        ✅ TypeScript is working!<br/>
        ✅ Tailwind CSS is working!
      </p>
    </div>
  )
}
