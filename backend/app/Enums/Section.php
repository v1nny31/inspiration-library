<?php

namespace App\Enums;

/**
 * The library's tabs. Each has its own categories and inspirations.
 */
enum Section: string
{
    /** Full-page / hero-section inspiration. */
    case Hero = 'hero';

    /** Individual UI components (buttons, pagination, cards…). */
    case Components = 'components';
}
