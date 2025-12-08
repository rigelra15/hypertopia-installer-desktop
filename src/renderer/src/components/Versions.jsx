import { useState } from 'react'

function Versions() {
  const [versions] = useState(window.electron.process.versions)

  return (
    <ul className="absolute bottom-[30px] left-1/2 -translate-x-1/2 inline-flex items-center overflow-hidden rounded-[22px] bg-[#202127] py-[15px] font-mono text-sm text-white/80 max-[620px]:hidden">
      <li className="border-r border-gray-600 px-5 leading-none last:border-none">
        Electron v{versions.electron}
      </li>
      <li className="border-r border-gray-600 px-5 leading-none last:border-none">
        Chromium v{versions.chrome}
      </li>
      <li className="px-5 leading-none last:border-none">Node v{versions.node}</li>
    </ul>
  )
}

export default Versions
