# Marshmallow - Nova Mega Filter

> [!important]
> This package was originally forked from [digital-creative/nova-mega-filter](<[https://github.com/dcasia/nova-mega-filter](https://github.com/dcasia/nova-mega-filter)>). Since we were making many opinionated changes, we decided to continue development in our own version rather than submitting pull requests that might not benefit all users of the original package. You’re welcome to use this package—we’re actively maintaining it. If you encounter any issues, please don’t hesitate to reach out.

# Nova Mega Filter

[![Latest Version on Packagist](https://img.shields.io/packagist/v/marshmallow/nova-mega-filter)](https://packagist.org/packages/marshmallow/nova-mega-filter)
[![Total Downloads](https://img.shields.io/packagist/dt/marshmallow/nova-mega-filter)](https://packagist.org/packages/marshmallow/nova-mega-filter)
[![License](https://img.shields.io/packagist/l/marshmallow/nova-mega-filter)](https://github.com/marshmallow-packages/nova-mega-filter/blob/main/LICENSE)

Display all your filters in a card instead of a tiny dropdown!

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/marshmallow-packages/nova-mega-filter/main/screenshots/dark.png">
  <img alt="Nova Mega Filter in Action" src="https://raw.githubusercontent.com/marshmallow-packages/nova-mega-filter/main/screenshots/light.png">
</picture>

# Installation

You can install the package via composer:

```shell
composer require marshmallow/nova-mega-filter
```

## Basic Usage

Basic demo showing the power of this package:

```php
use Marshmallow\MegaFilter\MegaFilter;
use Marshmallow\MegaFilter\MegaFilterTrait;

class ExampleNovaResource extends Resource {

    use MegaFilterTrait;

    public function filters(RequestRequest $request): array
    {
        return [
            MegaFilter::make([
                DateOfBirthFilter::make(),
                UserTypeFilter::make(),
            ]),
        ];
    }

}
```

And you are done!

---

You can also add other fields alongside your Mega Filters, they will be rendered as usual:

```php
use Marshmallow\MegaFilter\MegaFilter;
use Marshmallow\MegaFilter\MegaFilterTrait;

class ExampleNovaResource extends Resource {

    use MegaFilterTrait;

    public function filters(NovaRequest $request): array
    {
        return [
            MegaFilter::make([ ... ]),

            // These will be rendered as normal on the usual tiny filter dropdown
            DateOfBirthFilter::make(),
            UserTypeFilter::make(),
        ];
    }

}
```

You can also set how many columns you want to display your filters:

```php
public function filters(NovaRequest $request): array
{
    return [
        MegaFilter::make([ ... ])->columns(3),
    ];
}
```

By default, the filter section is collapsed. If you want it to open or expanded initially, you can do:

```php
public function filters(NovaRequest $request): array
{
    return [
        MegaFilter::make([ ... ])->open(),
    ];
}
```

## Filter Width Control

You can control the width of individual filters using Tailwind CSS width classes. This allows you to create custom layouts where some filters take up more or less space:

```php
public function filters(NovaRequest $request): array
{
    return [
        MegaFilter::make([
            (new Filter001)->withMeta(['width' => 'w-1/3']),
            (new Filter002)->withMeta(['width' => 'w-2/3']),
            (new Filter003),  // Uses default width
            (new Filter004)->withMeta(['width' => 'w-1/2']),
            (new Filter005)->withMeta(['width' => 'w-1/2']),
        ]),
    ];
}
```

Available width classes include:

-   `w-full` - Full width (default)
-   `w-1/2` - Half width (50%)
-   `w-1/3` - One third width (33.33%)
-   `w-2/3` - Two thirds width (66.67%)
-   `w-1/4` - Quarter width (25%)
-   `w-3/4` - Three quarters width (75%)
-   `w-1/6`, `w-2/6`, `w-3/6`, `w-4/6`, `w-5/6` - Sixth-based widths
-   `w-1/12`, `w-2/12`, `w-3/12`, etc. - Twelfth-based widths
-   Any other Tailwind width class

> Note: At the moment this package only works with a single Mega Filter per resource, adding multiple on the same resource may result in unexpected behavior.

## License

The MIT License (MIT). Please see [License File](https://raw.githubusercontent.com/marshmallow-packages/nova-mega-filter/master/LICENSE) for more information.
