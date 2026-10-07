<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The optional address of the website a screenshot was taken from.
     */
    public function up(): void
    {
        Schema::table('inspirations', function (Blueprint $table) {
            $table->string('website_url', 2048)->nullable()->after('image_path');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inspirations', function (Blueprint $table) {
            $table->dropColumn('website_url');
        });
    }
};
