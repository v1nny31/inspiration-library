<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Split the library into sections (see App\Enums\Section). Everything that
     * already exists was hero inspiration, hence the default.
     */
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->string('section')->default('hero')->after('id');
            // The same category name may exist once per section.
            $table->dropUnique(['name']);
            $table->unique(['section', 'name']);
        });

        Schema::table('inspirations', function (Blueprint $table) {
            $table->string('section')->default('hero')->after('id')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inspirations', function (Blueprint $table) {
            $table->dropIndex(['section']);
            $table->dropColumn('section');
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->dropUnique(['section', 'name']);
            $table->unique('name');
            $table->dropColumn('section');
        });
    }
};
