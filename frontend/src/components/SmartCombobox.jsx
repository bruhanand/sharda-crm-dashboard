import React, { useState, useRef, useEffect } from 'react'
import './SmartCombobox.css'

/**
 * SmartCombobox - Intelligent dropdown with search, filter, and "Add New" functionality
 * @param {string} label - Field label
 * @param {string} value - Current value
 * @param {function} onChange - Change handler
 * @param {array} options - Array of options to show in dropdown
 * @param {string} placeholder - Placeholder text
 * @param {boolean} required - Is field required
 * @param {boolean} allowCustom - Allow custom values (shows "Add New" option)
 */
const SmartCombobox = ({
    label,
    value,
    onChange,
    options = [],
    placeholder = 'Select or type...',
    required = false,
    allowCustom = true
}) => {
    const [isOpen, setIsOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [isCustomMode, setIsCustomMode] = useState(false)
    const containerRef = useRef(null)
    const inputRef = useRef(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false)
                setSearchTerm('')
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Filter options based on search term
    const filteredOptions = options.filter(option =>
        option.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleInputChange = (e) => {
        const val = e.target.value
        setSearchTerm(val)

        if (isCustomMode) {
            // In custom mode, directly set the value
            onChange(val)
        }
    }

    const handleOptionSelect = (option) => {
        if (option === '__ADD_NEW__') {
            setIsCustomMode(true)
            setIsOpen(false)
            setSearchTerm('')
            onChange('')
            setTimeout(() => inputRef.current?.focus(), 0)
        } else {
            onChange(option)
            setIsOpen(false)
            setSearchTerm('')
            setIsCustomMode(false)
        }
    }

    const handleInputFocus = () => {
        if (!isCustomMode) {
            setIsOpen(true)
        }
    }

    const handleInputBlur = () => {
        // Small delay to allow click on option
        setTimeout(() => {
            if (!isCustomMode) {
                setSearchTerm('')
            }
        }, 200)
    }

    const handleClearCustom = () => {
        setIsCustomMode(false)
        onChange('')
        setSearchTerm('')
        setTimeout(() => inputRef.current?.focus(), 0)
    }

    const displayValue = isCustomMode ? value : (searchTerm || value)

    return (
        <div className="smart-combobox-container" ref={containerRef}>
            {label && (
                <label className="smart-combobox-label">
                    {label} {required && <span className="required-asterisk">*</span>}
                </label>
            )}

            <div className="smart-combobox-input-wrapper">
                <input
                    ref={inputRef}
                    type="text"
                    className="smart-combobox-input"
                    value={displayValue}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    placeholder={placeholder}
                    required={required}
                    autoComplete="off"
                />

                {isCustomMode && (
                    <button
                        type="button"
                        className="custom-mode-badge"
                        onClick={handleClearCustom}
                        title="Switch back to dropdown"
                    >
                        ✨ Custom ×
                    </button>
                )}

                {!isCustomMode && (
                    <button
                        type="button"
                        className="dropdown-toggle"
                        onClick={() => setIsOpen(!isOpen)}
                        tabIndex={-1}
                    >
                        {isOpen ? '▲' : '▼'}
                    </button>
                )}
            </div>

            {isOpen && !isCustomMode && (
                <div className="smart-combobox-dropdown">
                    {filteredOptions.length > 0 ? (
                        <>
                            {filteredOptions.map((option, index) => (
                                <div
                                    key={index}
                                    className={`dropdown-option ${value === option ? 'selected' : ''}`}
                                    onClick={() => handleOptionSelect(option)}
                                >
                                    {value === option && <span className="check-icon">✓</span>}
                                    {option}
                                </div>
                            ))}

                            {allowCustom && (
                                <>
                                    <div className="dropdown-divider"></div>
                                    <div
                                        className="dropdown-option add-new-option"
                                        onClick={() => handleOptionSelect('__ADD_NEW__')}
                                    >
                                        <span className="add-icon">✨</span>
                                        Add New Value
                                    </div>
                                </>
                            )}
                        </>
                    ) : (
                        <div className="dropdown-empty">
                            {searchTerm ? (
                                <>
                                    <p>No matches found</p>
                                    {allowCustom && (
                                        <div
                                            className="dropdown-option add-new-option"
                                            onClick={() => handleOptionSelect('__ADD_NEW__')}
                                        >
                                            <span className="add-icon">✨</span>
                                            Add "{searchTerm}" as new value
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <p>No options available</p>
                                    {allowCustom && (
                                        <div
                                            className="dropdown-option add-new-option"
                                            onClick={() => handleOptionSelect('__ADD_NEW__')}
                                        >
                                            <span className="add-icon">✨</span>
                                            Add New Value
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default SmartCombobox
