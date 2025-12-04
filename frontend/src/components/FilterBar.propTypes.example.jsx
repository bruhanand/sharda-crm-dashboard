/**
 * FilterBar Component with PropTypes validation
 */
import PropTypes from 'prop-types'

const FilterBar = ({
    filters,
    onFilterChange,
    onClearFilters,
    onApplyDateFilters,
    dateDraft,
    onDateDraftChange
}) => {
    // Component implementation...
    return (
        <div className="filter-bar">
            {/* Filter UI */}
        </div>
    )
}

FilterBar.propTypes = {
    filters: PropTypes.shape({
        startDate: PropTypes.string,
        endDate: PropTypes.string,
        status: PropTypes.string,
        dealer: PropTypes.string,
        region: PropTypes.string,
    }).isRequired,
    onFilterChange: PropTypes.func.isRequired,
    onClearFilters: PropTypes.func.isRequired,
    onApplyDateFilters: PropTypes.func.isRequired,
    dateDraft: PropTypes.shape({
        start: PropTypes.string,
        end: PropTypes.string,
    }).isRequired,
    onDateDraftChange: PropTypes.func.isRequired,
}

export default FilterBar
