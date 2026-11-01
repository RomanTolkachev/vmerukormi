import {useContext, type ReactNode} from 'react'
import { ThemeContext } from "@/shared/ui/kit/theme/desktop/Provider";
import styles from "@/shared/ui/kit/theme/desktop/UupDesignScope.module.css"

/** Local UUP tokens and useDesign(), without changing the page's registered design. */
export function UupDesignScope({children}: {children: ReactNode}) {
  const theme = useContext(ThemeContext)

  if (!theme) throw new Error('UupDesignScope requires ThemeProvider')

  return (
    <ThemeContext.Provider value={{...theme, design: 'uup'}}>
      <div className={styles.scope} data-design-scope="uup" data-theme={theme.theme}>
        {children}
      </div>
    </ThemeContext.Provider>
  )
}

