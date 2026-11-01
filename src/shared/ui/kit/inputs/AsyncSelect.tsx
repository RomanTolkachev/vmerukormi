import type { InputSize } from "@/shared/ui/kit/inputs/inputSize";
import {useQuery, type QueryKey} from '@tanstack/react-query'
import {useEffect, useId, useMemo, useRef, useState, type ReactNode} from 'react'
import { FloatingPortal } from "@/shared/ui/kit/floating-portal/FloatingPortal";
import { useFloatingAnchorRect } from "@/shared/ui/kit/floating-portal/useFloatingAnchorRect";
import { useFloatingPortalRect } from "@/shared/ui/kit/floating-portal/useFloatingPortalRect";
import { ASYNC_SELECT_REQUEST_DEBOUNCE_MS } from "@/shared/ui/kit/config/asyncSelect";
import { TextInput } from "@/shared/ui/kit/inputs/TextInput";
import { TextButton } from "@/shared/ui/kit/buttons/TextButton";
import { getDropdownPlacement } from "@/shared/ui/kit/inputs/dropdownPlacement";
import styles from "@/shared/ui/kit/inputs/AsyncSelect.module.css"
import selectStyles from "@/shared/ui/kit/inputs/SelectInput.module.css"

export type AsyncSelectOption = {
  value: string
  label: ReactNode
  description?: ReactNode
}

export type AsyncSelectLoadOptionsContext = {
  search: string
  signal: AbortSignal
}

export type AsyncSelectProps<TOption extends AsyncSelectOption = AsyncSelectOption> = {
  id?: string
  size?: InputSize
  label: ReactNode
  value: string
  selectedOption?: TOption | null
  placeholder?: string
  searchPlaceholder?: string
  loadingLabel?: ReactNode
  emptyLabel?: ReactNode
  errorLabel?: ReactNode
  minimumSearchLabel?: ReactNode
  disabled?: boolean
  isError?: boolean
  clearable?: boolean
  minSearchLength?: number
  debounceMs?: number
  /** Переносить длинные варианты в выпадающем списке вместо обрезки многоточием. */
  wrapOptions?: boolean
  className?: string
  queryKey: QueryKey
  loadOptions: (context: AsyncSelectLoadOptionsContext) => Promise<readonly TOption[]>
  onChange: (value: string, option: TOption | null) => void
}

function optionToText(option: AsyncSelectOption): string {
  if (typeof option.label === 'string' || typeof option.label === 'number') {
    return String(option.label)
  }

  return option.value
}

export function AsyncSelect<TOption extends AsyncSelectOption = AsyncSelectOption>({
  id,
  size = 'md',
  label,
  value,
  selectedOption: externalSelectedOption = null,
  placeholder = 'Выберите значение',
  searchPlaceholder = 'Начните вводить для поиска',
  loadingLabel = 'Загрузка...',
  emptyLabel = 'Варианты не найдены',
  errorLabel = 'Не удалось загрузить варианты',
  minimumSearchLabel,
  disabled = false,
  isError = false,
  clearable = true,
  minSearchLength = 0,
  debounceMs = ASYNC_SELECT_REQUEST_DEBOUNCE_MS,
  wrapOptions = false,
  className,
  queryKey,
  loadOptions,
  onChange,
}: AsyncSelectProps<TOption>) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const rootRef = useRef<HTMLDivElement | null>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [internalSelectedOption, setInternalSelectedOption] = useState<TOption | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const trimmedSearch = search.trim()
  const canSearch = trimmedSearch.length >= minSearchLength
  const isDebouncing = debouncedSearch !== trimmedSearch
  const optionsQuery = useQuery({
    enabled: typeof window !== 'undefined' && isOpen && !disabled && canSearch && !isDebouncing,
    gcTime: 60_000,
    queryFn: ({signal}) => loadOptions({search: debouncedSearch, signal}),
    queryKey: [...queryKey, debouncedSearch],
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 20_000,
  })
  const options = useMemo(
    () => !isDebouncing && canSearch ? optionsQuery.data ?? [] : [],
    [canSearch, isDebouncing, optionsQuery.data]
  )
  const isLoading = canSearch && (isDebouncing || optionsQuery.isFetching)
  const error = !isDebouncing ? optionsQuery.error : null
  const retainedOption = externalSelectedOption?.value === value
    ? externalSelectedOption
    : internalSelectedOption?.value === value ? internalSelectedOption : null
  const currentOption = useMemo(
    () => options.find(option => option.value === value) ?? retainedOption,
    [options, retainedOption, value],
  )
  const inputValue = isOpen ? search : currentOption ? optionToText(currentOption) : ''
  const anchorRect = useFloatingAnchorRect(rootRef, isOpen)
  const portalRect = useFloatingPortalRect(isOpen)
  const dropdownPlacement = anchorRect === null ? null : getDropdownPlacement(anchorRect, undefined, portalRect)
  const dropdownStyle = dropdownPlacement === null
    ? undefined
    : {
      ...dropdownPlacement.style,
      maxHeight: dropdownPlacement.maxHeight,
    }
  // Сервер определяет состав результатов поиска. Ранее выбранную опцию нельзя
  // подмешивать в новую выдачу, если текущий запрос её не вернул.
  const visibleOptions = options

  if (value === '' && internalSelectedOption !== null) setInternalSelectedOption(null)

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(trimmedSearch), debounceMs)

    return () => window.clearTimeout(timeout)
  }, [debounceMs, trimmedSearch])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node

      if (rootRef.current?.contains(target) || dropdownRef.current?.contains(target)) {
        return
      }

      setIsOpen(false)
      setSearch('')
    }

    document.addEventListener('pointerdown', handlePointerDown)

    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen])

  const selectOption = (option: TOption) => {
    setInternalSelectedOption(option)
    onChange(option.value, option)
    setSearch('')
    setIsOpen(false)
  }

  const clearValue = () => {
    setInternalSelectedOption(null)
    onChange('', null)
    setSearch('')
    setIsOpen(false)
  }

  const dropdown = typeof document !== 'undefined'
    && isOpen
    && dropdownStyle !== undefined
    && dropdownPlacement !== null
    && dropdownPlacement.maxHeight > 0
    ? (
      <FloatingPortal
        className={wrapOptions ? `${selectStyles.dropdownPortal} ${styles.wrapOptions}` : selectStyles.dropdownPortal}
        id={`${inputId}Options`}
        ref={dropdownRef}
        role="listbox"
        style={dropdownStyle}
      >
        <div className={selectStyles.dropdownScrollMask}>
          <div className={`${selectStyles.dropdownList} ${selectStyles.dropdownScroll}`}>
            {!canSearch && minSearchLength > 0 ? (
              <div className={selectStyles.emptyOption}>
                {minimumSearchLabel ?? `Введите минимум ${minSearchLength} символа`}
              </div>
            ) : null}
            {isLoading ? (
              <div className={selectStyles.emptyOption}>
                {loadingLabel}
              </div>
            ) : null}
            {!isLoading && error ? (
              <div className={`${selectStyles.emptyOption} ${styles.error}`}>
                {errorLabel}
                <TextButton variant="ghost" size="sm" onClick={() => void optionsQuery.refetch()}>Повторить</TextButton>
              </div>
            ) : null}
            {!isLoading && !error && canSearch && visibleOptions.length === 0 ? (
              <div className={selectStyles.emptyOption}>
                {emptyLabel}
              </div>
            ) : null}
            {!isLoading && !error
              ? visibleOptions.map((option, index) => (
                <button
                  id={`${inputId}Option${index}`}
                  className={`${selectStyles.option} ${styles.option} ${option.value === value || activeIndex === index ? selectStyles.optionSelected : ''}`}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  key={option.value}
                  onClick={() => selectOption(option)}
                >
                  <span className={styles.optionLabel}>{option.label}</span>
                  {option.description ? (
                    <span className={styles.optionDescription}>{option.description}</span>
                  ) : null}
                </button>
              ))
              : null}
          </div>
        </div>
      </FloatingPortal>
    )
    : null

  return (
    <div className={className ? `${styles.root} ${className}` : styles.root}>
      <label className={styles.label} htmlFor={inputId}>{label}</label>
      <div className={`${styles.field} ${clearable && value !== '' ? styles.fieldWithClear : ''}`} ref={rootRef}>
        <TextInput
          id={inputId}
          size={size}
          isError={isError}
          type="text"
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={`${inputId}Options`}
          aria-activedescendant={isOpen && activeIndex >= 0 && activeIndex < visibleOptions.length ? `${inputId}Option${activeIndex}` : undefined}
          aria-autocomplete="list"
          value={inputValue}
          placeholder={isOpen ? searchPlaceholder : placeholder}
          disabled={disabled}
          onFocus={() => {
            setSearch('')
            setActiveIndex(-1)
            setIsOpen(true)
          }}
          onChange={event => {
            setSearch(event.target.value)
            setActiveIndex(-1)
            setIsOpen(true)
          }}
          onBlur={event => {
            if (!dropdownRef.current?.contains(event.relatedTarget)) {setIsOpen(false); setSearch(''); setActiveIndex(-1)}
          }}
          onKeyDown={event => {
            if (event.key === 'Escape' && isOpen) {
              event.preventDefault(); event.stopPropagation(); setIsOpen(false); setSearch(''); setActiveIndex(-1)
            } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault()
              setIsOpen(true)
              if (visibleOptions.length) {
                const next = event.key === 'ArrowDown' ? Math.min(activeIndex + 1, visibleOptions.length - 1) : Math.max(0, activeIndex - 1)
                setActiveIndex(next)
                document.getElementById(`${inputId}Option${next}`)?.scrollIntoView({block: 'nearest'})
              }
            } else if (event.key === 'Enter' && isOpen) {
              event.preventDefault()
              const option = visibleOptions[activeIndex]
              if (option) {selectOption(option); setActiveIndex(-1)}
            } else if (event.key === 'Tab') {
              setIsOpen(false); setSearch(''); setActiveIndex(-1)
            }
          }}
        />
        {clearable && value !== '' ? (
          <button
            className={styles.clearButton}
            type="button"
            disabled={disabled}
            aria-label="Очистить"
            onClick={clearValue}
          />
        ) : null}
      </div>
      {dropdown}
    </div>
  )
}

