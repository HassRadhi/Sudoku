import { useState } from 'react'
import { Menu } from './features/menu/Menu'
import { PlayGame } from './features/play/PlayGame'

type Screen = 'menu' | 'play'

function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [playKey, setPlayKey] = useState(0)

  const openPlay = () => {
    setPlayKey((key) => key + 1)
    setScreen('play')
  }

  return (
    <main className="app">
      <h1 className="visually-hidden">Sudoku</h1>
      {screen === 'menu' ? (
        <Menu onPlay={openPlay} />
      ) : (
        <PlayGame key={playKey} onMenu={() => setScreen('menu')} />
      )}
    </main>
  )
}

export default App
