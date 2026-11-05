import { useEffect, useState } from 'react'
import App from './App.tsx'
import Loja from './loja/Loja.tsx'
import Espetinho from './espetinho/Espetinho.tsx'

export default function Root() {
  const [hash, setHash] = useState(window.location.hash)

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (hash === '#espetinho') return <Espetinho />
  return hash === '#calculadora' ? <App /> : <Loja />
}
