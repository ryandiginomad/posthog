import { DateDisplay } from 'lib/components/DateDisplay'

import { InsightActorsQuery, InsightVizNode, ResolvedDateRangeResponse } from '~/queries/schema/schema-general'
import { QueryContext } from '~/queries/types'
import { IntervalType } from '~/types'

import type { OpenPersonsModalProps } from '../../persons-modal/PersonsModal'
import type { IndexedTrendResult } from '../../types'
import { datasetToActorsQuery } from '../datasetToActorsQuery'

export interface TrendsBarChartClickDeps {
    context?: QueryContext<InsightVizNode>
    hasPersonsModal: boolean
    interval: IntervalType | null | undefined
    timezone: string
    weekStartDay: number | null | undefined
    resolvedDateRange: ResolvedDateRangeResponse | null | undefined
    querySource: InsightActorsQuery['source'] | null | undefined
    indexedResults: IndexedTrendResult[]
    openPersonsModal: (props: OpenPersonsModalProps) => void
}

function resolveDataset(seriesKey: string, indexedResults: IndexedTrendResult[]): IndexedTrendResult | null {
    return indexedResults.find((r) => String(r.id) === seriesKey) ?? null
}

export function handleTrendsBarTimeChartClick(
    seriesKey: string,
    dataIndex: number,
    deps: TrendsBarChartClickDeps
): void {
    const dataset = resolveDataset(seriesKey, deps.indexedResults)
    if (!dataset) {
        return
    }

    const day = dataset.action?.days?.[dataIndex] ?? dataset.days?.[dataIndex]
    if (day == null || day === '') {
        return
    }

    if (deps.context?.onDataPointClick) {
        deps.context.onDataPointClick(
            {
                breakdown: dataset.breakdown_value,
                compare: dataset.compare_label || undefined,
                day,
            },
            // Legacy parity with ActionsLineGraph — passes the first result, not the clicked one.
            deps.indexedResults[0]
        )
        return
    }

    if (!deps.hasPersonsModal || !deps.querySource) {
        return
    }

    const title = (actorLabel: string): JSX.Element => (
        <>
            {actorLabel} on{' '}
            <DateDisplay
                interval={deps.interval || 'day'}
                resolvedDateRange={deps.resolvedDateRange ?? undefined}
                timezone={deps.timezone}
                weekStartDay={deps.weekStartDay ?? undefined}
                date={day}
            />
        </>
    )

    deps.openPersonsModal({
        title,
        query: datasetToActorsQuery({ dataset, query: deps.querySource, day }),
        additionalSelect: {
            value_at_data_point: 'event_count',
            matched_recordings: 'matched_recordings',
        },
        orderBy: ['event_count DESC, actor_id DESC'],
    })
}

/** Click handler for horizontal aggregated bars (ActionsBarValue). The chart is sparse-stacked
 *  so band index === result index — resolve via dataIndex, not the primary series picked by
 *  buildPointClickData (that's the first non-excluded series, regardless of which band was clicked). */
export function handleTrendsBarAggregatedChartClick(dataIndex: number, deps: TrendsBarChartClickDeps): void {
    const dataset = deps.indexedResults[dataIndex]
    if (!dataset) {
        return
    }

    if (deps.context?.onDataPointClick) {
        deps.context.onDataPointClick(
            {
                breakdown: dataset.breakdown_value,
                compare: dataset.compare_label || undefined,
            },
            // Legacy parity with ActionsHorizontalBar — passes the first result, not the clicked one.
            deps.indexedResults[0]
        )
        return
    }

    if (!deps.hasPersonsModal || !deps.querySource) {
        return
    }

    deps.openPersonsModal({
        title: dataset.label || '',
        query: datasetToActorsQuery({ dataset, query: deps.querySource }),
        additionalSelect: {
            value_at_data_point: 'event_count',
            matched_recordings: 'matched_recordings',
        },
        orderBy: ['event_count DESC, actor_id DESC'],
    })
}
